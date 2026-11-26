/**
 * "Create on GitHub": sign in through `/api/github/login`, then create the repository and push
 * the generated files as its first commit, straight from the browser with the GitHub API.
 * The token arrives in the URL fragment and lives only in memory.
 */

const PENDING = "stackforge:github";
const API = "https://api.github.com";

export interface PendingRepo {
  name: string;
  private: boolean;
  /** Files edited in the preview, which the round trip through GitHub would otherwise lose. */
  edits: [string, string][];
}

/** Saves what to create and leaves for GitHub's consent screen. */
export function startGitHubCreate(pending: PendingRepo): void {
  try {
    sessionStorage.setItem(PENDING, JSON.stringify(pending));
  } catch {
    // Without storage the defaults (project name, public) still work.
  }
  const back = window.location.pathname + window.location.search;
  window.location.assign(
    `/api/github/login?private=${pending.private ? "1" : "0"}&return=${encodeURIComponent(back)}`,
  );
}

export type GitHubReturn =
  { token: string; pending: PendingRepo | null } | { error: string } | null;

/** Reads (and removes from the address bar) what the OAuth callback sent back, if anything. */
export function takeGitHubReturn(): GitHubReturn {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const token = hash.get("github_token");
  const error = hash.get("github_error");
  if (!token && !error) return null;
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
  if (error) return { error };
  return { token: token ?? "", pending: readPending() };
}

/** What `startGitHubCreate` saved, read once: storage can be unavailable or hold junk. */
function readPending(): PendingRepo | null {
  try {
    const saved = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    return saved ? (JSON.parse(saved) as PendingRepo) : null;
  } catch {
    return null;
  }
}

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    errors?: { message?: string }[];
  };
  if (!response.ok) {
    const detail = data.errors?.[0]?.message ?? data.message ?? "";
    throw new GitHubError(detail || `HTTP ${response.status}`, response.status);
  }
  return data;
}

/**
 * The ref of GitHub's initial commit. Right after creation GitHub can still answer 409 ("Git
 * Repository is empty") or 404 for a moment, so those are retried before giving up.
 */
async function firstCommit(
  token: string,
  refPath: string,
  attempts = 8,
  delay = 750,
): Promise<{ object: { sha: string } }> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call<{ object: { sha: string } }>(token, "GET", refPath);
    } catch (error) {
      const notReady =
        error instanceof GitHubError &&
        (error.status === 409 || error.status === 404);
      if (!notReady || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Creates `name` on the signed-in account and commits `files` to its default branch. The
 * repository starts with GitHub's own initial commit (an empty one can't take Git Data API
 * writes); the project's tree replaces it in the next commit.
 */
export async function createRepository(
  token: string,
  repo: { name: string; private: boolean; description: string },
  files: Map<string, string>,
): Promise<string> {
  const created = await call<{
    full_name: string;
    html_url: string;
    default_branch: string;
  }>(token, "POST", "/user/repos", {
    name: repo.name,
    private: repo.private,
    description: repo.description,
    auto_init: true,
  });
  const path = `/repos/${created.full_name}`;
  const branch = created.default_branch;
  const head = await firstCommit(token, `${path}/git/ref/heads/${branch}`);
  const tree = await call<{ sha: string }>(token, "POST", `${path}/git/trees`, {
    tree: [...files].map(([file, content]) => ({
      path: file,
      mode: "100644",
      type: "blob",
      content,
    })),
  });
  const commit = await call<{ sha: string }>(
    token,
    "POST",
    `${path}/git/commits`,
    {
      message: "Initial commit from pickstack",
      tree: tree.sha,
      parents: [head.object.sha],
    },
  );
  await call(token, "PATCH", `${path}/git/refs/heads/${branch}`, {
    sha: commit.sha,
  });
  return created.html_url;
}

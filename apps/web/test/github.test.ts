import { afterEach, describe, expect, it, vi } from "vitest";
import { callback, login, safeReturn } from "../api/github/_oauth";
import { createRepository, GitHubError } from "../src/lib/github";

const env = { clientId: "client-id", clientSecret: "secret" };
const origin = "https://pickstack.test";

function stateCookie(response: Response): string {
  const header = response.headers.get("Set-Cookie") ?? "";
  return header.split(";")[0] ?? "";
}

describe("OAuth login", () => {
  it("asks GitHub for public_repo by default and repo for private repositories", () => {
    const publicLogin = login(
      new Request(`${origin}/api/github/login?return=/%3Ff%3Dvue`),
      env,
    );
    const to = new URL(publicLogin.headers.get("Location") ?? "");
    expect(to.origin + to.pathname).toBe(
      "https://github.com/login/oauth/authorize",
    );
    expect(to.searchParams.get("scope")).toBe("public_repo");
    // GitHub uses the callback registered for the app.
    expect(to.searchParams.has("redirect_uri")).toBe(false);
    expect(publicLogin.headers.get("Set-Cookie")).toContain("HttpOnly");

    const privateLogin = login(
      new Request(`${origin}/api/github/login?private=1`),
      env,
    );
    const scope = new URL(
      privateLogin.headers.get("Location") ?? "",
    ).searchParams.get("scope");
    expect(scope).toBe("repo");
  });

  it("only returns to paths on this site", () => {
    expect(safeReturn("/?f=vue")).toBe("/?f=vue");
    expect(safeReturn("//evil.example")).toBe("/");
    expect(safeReturn("https://evil.example")).toBe("/");
    expect(safeReturn(null)).toBe("/");
  });
});

describe("OAuth callback", () => {
  async function roundTrip(
    tamper: (state: string) => string,
    exchange: () => Response,
  ) {
    const start = login(
      new Request(`${origin}/api/github/login?return=/%3Ff%3Dvue`),
      env,
    );
    const state =
      new URL(start.headers.get("Location") ?? "").searchParams.get("state") ??
      "";
    const fetchFn = vi.fn(async () => exchange());
    const response = await callback(
      new Request(
        `${origin}/api/github/callback?code=abc&state=${tamper(state)}`,
        { headers: { cookie: stateCookie(start) } },
      ),
      env,
      fetchFn as unknown as typeof fetch,
    );
    return { response, fetchFn };
  }

  it("trades the code for a token and returns it in the fragment", async () => {
    const { response, fetchFn } = await roundTrip(
      (s) => s,
      () => Response.json({ access_token: "gho_token" }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "/?f=vue#github_token=gho_token",
    );
    expect(response.headers.get("Set-Cookie")).toContain("Max-Age=0");
    const init = (fetchFn.mock.calls[0] as unknown[] | undefined)?.[1] as
      RequestInit | undefined;
    expect(JSON.parse(String(init?.body))).toMatchObject({
      client_id: "client-id",
      client_secret: "secret",
      code: "abc",
    });
  });

  it("refuses a state it did not issue", async () => {
    const { response, fetchFn } = await roundTrip(
      () => "forged",
      () => Response.json({ access_token: "gho_token" }),
    );
    expect(response.headers.get("Location")).toBe(
      "/?f=vue#github_error=state_mismatch",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("passes GitHub's error on", async () => {
    const { response } = await roundTrip(
      (s) => s,
      () => Response.json({ error: "bad_verification_code" }),
    );
    expect(response.headers.get("Location")).toBe(
      "/?f=vue#github_error=bad_verification_code",
    );
  });
});

describe("createRepository", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("creates the repository and commits every file onto its first commit", async () => {
    const calls: { method: string; path: string; body: unknown }[] = [];
    const replies: Record<string, unknown> = {
      "POST /user/repos": {
        full_name: "me/app",
        html_url: "https://github.com/me/app",
        default_branch: "main",
      },
      "GET /repos/me/app/git/ref/heads/main": { object: { sha: "init" } },
      "POST /repos/me/app/git/trees": { sha: "tree" },
      "POST /repos/me/app/git/commits": { sha: "commit" },
      "PATCH /repos/me/app/git/refs/heads/main": {},
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init: RequestInit) => {
        const path = url.replace("https://api.github.com", "");
        const method = init.method ?? "GET";
        calls.push({
          method,
          path,
          body: init.body ? JSON.parse(String(init.body)) : undefined,
        });
        return Response.json(replies[`${method} ${path}`]);
      }),
    );

    const url = await createRepository(
      "token",
      { name: "app", private: true, description: "d" },
      new Map([
        ["package.json", "{}"],
        ["src/main.ts", "x"],
      ]),
    );

    expect(url).toBe("https://github.com/me/app");
    expect(calls.map((c) => `${c.method} ${c.path}`)).toEqual(
      Object.keys(replies),
    );
    expect(calls[0]?.body).toMatchObject({ private: true, auto_init: true });
    expect(calls[2]?.body).toEqual({
      tree: [
        { path: "package.json", mode: "100644", type: "blob", content: "{}" },
        { path: "src/main.ts", mode: "100644", type: "blob", content: "x" },
      ],
    });
    expect(calls[3]?.body).toMatchObject({ tree: "tree", parents: ["init"] });
    expect(calls[4]?.body).toEqual({ sha: "commit" });
  });

  it("reports GitHub's status, e.g. 422 for a taken name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          {
            message: "Repository creation failed.",
            errors: [{ message: "name already exists on this account" }],
          },
          { status: 422 },
        ),
      ),
    );
    const error = await createRepository(
      "token",
      { name: "app", private: false, description: "" },
      new Map(),
    ).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(GitHubError);
    expect((error as GitHubError).status).toBe(422);
    expect((error as GitHubError).message).toBe(
      "name already exists on this account",
    );
  });
});

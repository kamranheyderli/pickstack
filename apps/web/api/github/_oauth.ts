/**
 * GitHub OAuth for "Create on GitHub": the browser leaves for GitHub through `login`, comes
 * back through `callback`, and receives the token in the URL fragment, which never reaches a
 * server. The client secret stays here. Nothing is stored: the state cookie lives ten minutes.
 */

const COOKIE = "gh_oauth";

export interface OAuthEnv {
  clientId: string;
  clientSecret: string;
}

/** Only same-site paths: anything else would make the callback an open redirect. */
export function safeReturn(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/";
}

function cookie(value: string, maxAge: number): string {
  return `${COOKIE}=${value}; Path=/api/github; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function readCookie(header: string | null): string | null {
  for (const part of (header ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === COOKIE) return rest.join("=");
  }
  return null;
}

function redirect(location: string, setCookie: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      "Set-Cookie": setCookie,
      "Cache-Control": "no-store",
    },
  });
}

/** Starts the flow: remembers a random state and where to return, then asks GitHub. */
export function login(request: Request, env: OAuthEnv): Response {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const back = safeReturn(url.searchParams.get("return"));
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.clientId);
  // No redirect_uri: GitHub then returns to the callback registered for the app, so a
  // registered value that differs by an invisible character can't make it refuse.
  // public_repo can't create private repositories; repo can.
  authorize.searchParams.set(
    "scope",
    url.searchParams.get("private") === "1" ? "repo" : "public_repo",
  );
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("allow_signup", "true");
  return redirect(
    authorize.toString(),
    cookie(`${state}.${encodeURIComponent(back)}`, 600),
  );
}

/** Checks the state, trades the code for a token and hands it to the page in the fragment. */
export async function callback(
  request: Request,
  env: OAuthEnv,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const url = new URL(request.url);
  const saved = readCookie(request.headers.get("cookie"));
  const [state, encodedReturn] = saved?.split(".") ?? [];
  const back = safeReturn(
    encodedReturn ? decodeURIComponent(encodedReturn) : null,
  );
  const clear = cookie("", 0);
  const fail = (reason: string) =>
    redirect(`${back}#github_error=${encodeURIComponent(reason)}`, clear);

  const error = url.searchParams.get("error");
  if (error) return fail(error);
  const code = url.searchParams.get("code");
  if (!state || !code || url.searchParams.get("state") !== state) {
    return fail("state_mismatch");
  }

  const response = await fetchFn(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.clientId,
        client_secret: env.clientSecret,
        code,
      }),
    },
  );
  const body = (await response.json().catch(() => ({}))) as {
    access_token?: string;
    error?: string;
  };
  if (!body.access_token) return fail(body.error ?? "token_exchange_failed");
  return redirect(
    `${back}#github_token=${encodeURIComponent(body.access_token)}`,
    clear,
  );
}

/** Reads the app's credentials from Vercel's environment, or explains what is missing. */
export function oauthEnv(): OAuthEnv | Response {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return new Response(
      "GitHub sign-in is not configured: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.",
      { status: 500 },
    );
  }
  return { clientId, clientSecret };
}

import { login, oauthEnv } from "./_oauth.js";

export function GET(request: Request): Response {
  const env = oauthEnv();
  return env instanceof Response ? env : login(request, env);
}

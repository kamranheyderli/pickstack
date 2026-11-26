import { callback, oauthEnv } from "./_oauth.js";

export async function GET(request: Request): Promise<Response> {
  const env = oauthEnv();
  return env instanceof Response ? env : callback(request, env);
}

import Octokit from '@octokit/rest';
import { oauthLoginUrl, Result as LoginUrl } from '@octokit/oauth-login-url';
import { createOAuthAppAuth } from '@octokit/auth';
import { githubClientId, githubClientSecret } from '../env';

const oauthAppConfig = {
  clientId: githubClientId,
  clientSecret: githubClientSecret
}

/**
 * This factory produces an API which has higher rate
 * limits than unauthenticated requests, because it
 * has our app's config. **It does not have any user's**
 * **auth on it.**  It can be used for app config and
 * things like checking the validity of auth tokens.
 */
export function makeAppGitHub(){
  return new Octokit({ auth: { ...oauthAppConfig } });
}

/**
 * Given an oauthAccessToken (produced by passing a
 * `code` into `fetchUserAccessToken`), this returns
 * an API instance ready to query the user's info:
 * 
 * const GitHub = makeUserGitHub(...);
 * 
 * // All repos user has access to
 * GitHub.repos.list();
 * 
 * // Fetch files within any repo they have access to
 * userGitHub.repos.getContents({ ... })
 * 
 * @param oauthAccessToken 
 */
export function makeUserGitHub(oauthAccessToken:string){
  return new Octokit({
    auth: oauthAccessToken
  })
}

export const fetchUserAccessToken = async (code:string) => {
  const auth = await createOAuthAppAuth({
    ...oauthAppConfig,
    code
  });
  return await auth({ type: 'token' });
}

const REQUIRED_AUTH_SCOPES:string[] = ['read:user','repo'];

export function githubLoginUrl():string {
  return oauthLoginUrl({
    clientId: githubClientId as string,
    scopes: REQUIRED_AUTH_SCOPES
  }).url;
}
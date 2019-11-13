import Octokit from '@octokit/rest';
import { createOAuthAppAuth } from '@octokit/auth';
import { githubClientId, githubClientSecret } from '../env';

const oauthAppConfig = {
  clientId: githubClientId,
  clientSecret: githubClientSecret
}

export function makeAppGitHub(){
  return new Octokit({ auth: { ...oauthAppConfig } });
}

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
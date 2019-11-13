import Octokit from '@octokit/rest';
import { createOAuthAppAuth } from '@octokit/auth';
import { githubClientId, githubClientSecret } from '../env';

const GitHub = new Octokit({
  auth: {
    clientId: githubClientId,
    clientSecret: githubClientSecret
  }
});

export const createOauthFxn = async (code:string) => createOAuthAppAuth({
  clientId: githubClientId,
  clientSecret: githubClientSecret,
  code
});


export default GitHub;
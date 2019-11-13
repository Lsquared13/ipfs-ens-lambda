import Octokit from '@octokit/rest';
import { createOAuthAppAuth } from '@octokit/auth';
import { githubClientId, githubClientSecret } from '../env';

const GitHub = new Octokit({
  auth: {
    clientId: githubClientId,
    clientSecret: githubClientSecret
  }
});

export const fetchOAuthAccessToken = async (code:string) => {
  const auth = await createOAuthAppAuth({
    clientId: githubClientId,
    clientSecret: githubClientSecret,
    code
  });
  return await auth({ type: 'token' });
}


export default GitHub;
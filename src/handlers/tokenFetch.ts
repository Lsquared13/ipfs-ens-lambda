import { createOauthFxn } from '../services/github';
import { 
  isHttpMethod, userErrorResponse, unexpectedErrorResponse, successResponse
} from '@eximchain/dappbot-types/spec/responses';

const getAccessToken = async(event:any) => {
  // TODO: Plug in this API call: https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#2-users-are-redirected-back-to-your-site-by-github
  // Note that in practice, it should be automatically called by client
  // using the `code` value from the redirectUrl.
  let method = event.httpMethod.toUpperCase();
  if (!isHttpMethod(method)) {
    return userErrorResponse({ message: `Unrecognized HttpMethod: ${method}`})
  }
  if (method === 'OPTIONS') return successResponse(undefined);
  const body = event.body = event.body ? JSON.parse(event.body) : {};
  if (!body.code || typeof body.code !== 'string') {
    return userErrorResponse({ message: 'Request body must include a "code" key from OAuth redirect.'})
  }
  const githubAuth = await createOauthFxn(body.code);
  const accessToken = await githubAuth({ type: 'token' })
  return successResponse({
    accessToken
  })
}

interface AuthCode {
  code: string
}

export default getAccessToken;
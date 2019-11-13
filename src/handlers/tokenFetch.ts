import { fetchOAuthAccessToken } from '../services/github';
import { 
  isHttpMethod, userErrorResponse, unexpectedErrorResponse, successResponse
} from '@eximchain/dappbot-types/spec/responses';

/**
 * This API Gateway method handler should be called automatically
 * when the SPA gets a request with `code` in its query string;
 * value should be included in body.
 * @param event 
 */
const getAccessToken = async(event:any) => {
  let method = event.httpMethod.toUpperCase();
  if (!isHttpMethod(method)) {
    return userErrorResponse({ message: `Unrecognized HttpMethod: ${method}`})
  }
  if (method === 'OPTIONS') return successResponse(undefined);
  const body = event.body = event.body ? JSON.parse(event.body) : {};
  if (!body.code || typeof body.code !== 'string') {
    return userErrorResponse({ message: 'Request body must include a "code" key from OAuth redirect.'})
  }
  const accessToken = await fetchOAuthAccessToken(body.code);
  return successResponse({
    ...accessToken
  })
}

interface AuthCode {
  code: string
}

export default getAccessToken;
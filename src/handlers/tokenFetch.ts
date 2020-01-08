import { fetchUserAccessToken, githubLoginUrl } from '../services/github';
import { 
  isHttpMethod, userErrorResponse, successResponse
} from '@eximchain/api-types/spec/responses';
import { Login, LoginUrl } from '@eximchain/ipfs-ens-types/spec/methods/auth';
import { APIGatewayEvent } from '@eximchain/api-types/spec/events';

/**
 * This API Gateway method handler should be called automatically
 * when the SPA gets a request with `code` in its query string;
 * value should be included in body.
 * @param event 
 */
const getAccessToken = async(event:APIGatewayEvent) => {
  let method = event.httpMethod.toUpperCase();
  if (!isHttpMethod(method)) {
    return userErrorResponse({ message: `Unrecognized HttpMethod: ${method}`})
  }
  switch(method){
    case 'OPTIONS':
      return successResponse(undefined);
    case 'POST':
      const body = event.body = event.body ? JSON.parse(event.body) : {};
      if (!body.code || typeof body.code !== 'string') {
        return userErrorResponse({ message: 'Request body must include a "code" key from OAuth redirect.'})
      }
      const accessToken = await fetchUserAccessToken(body.code);
      const result:Login.Result = { ...accessToken } as Login.Result;
      return successResponse(result)
    case 'GET':
      const loginUrlResult:LoginUrl.Result = { loginUrl: githubLoginUrl() };
      return successResponse(loginUrlResult)
    default:
      return userErrorResponse({ message: `Unimplemented HttpMethod ${method}, GET & POST requests only.` })
  }  
}

export default getAccessToken;
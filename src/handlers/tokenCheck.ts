import { makeUserGitHub } from '../services/github';
import { APIGatewayAuthorizerEvent } from '@eximchain/api-types/spec/events';
import { RootResources } from '@eximchain/ipfs-ens-types/spec/methods'

const TokenCheck = async (event: APIGatewayAuthorizerEvent, context: any, callback: Function) => {
  const token = event.authorizationToken as string;
  console.log('TokenCheck processing a request');
  try {
    const GitHub = makeUserGitHub(token);
    
    // If this await resolves, the token is valid.
    const userInfo = await GitHub.users.getAuthenticated();
    callback(null, makeAuthorizedPolicy('user', event.methodArn, {
      // Including this ensures that the authorized handler (deployStart)
      // already has all of the user's profile data (username, email, 
      // repo url) right when it's executed.
      githubUserInfo: JSON.stringify(userInfo.data),
      ...context
    }))
  } catch (err) {
    console.log('Error on token check: ', err);
    // TODO: Validate we got a 404, log actual errors differently
    callback("Error: Invalid token");
  }
}
interface IAMStatement {
  Action: string
  Effect: string
  Resource: string
}

interface PolicyDocument {
  Version: string
  Statement: IAMStatement[]
}

type AuthContext = Record<string, string | number | boolean>;

// This interfaace is based on the API Gateway Custom Authorizer
// docs found here: https://github.com/awsdocs/amazon-api-gateway-developer-guide/blob/master/doc_source/api-gateway-lambda-authorizer-output.md
interface AuthorizerResponse {
  principalId: string
  policyDocument?: PolicyDocument
  context?: AuthContext
}
// Help function to generate an IAM policy, courtesy of
// https://github.com/awsdocs/amazon-api-gateway-developer-guide/blob/master/doc_source/apigateway-use-lambda-authorizer.md#example-create-a-token-based-lambda-authorizer-function
function makeAuthorizedPolicy(principalId: string, resourceArn: string, context?: AuthContext) {
  var authResponse = {} as AuthorizerResponse;
  authResponse.principalId = principalId;
  const policyDocument: PolicyDocument = {
    Version: '2012-10-17',
    Statement: makeApprovedResourcesArray(resourceArn).map(eachResource => ({
      Action: 'execute-api:Invoke',
      Effect: 'Allow',
      Resource: eachResource
    }))
  };
  authResponse.policyDocument = policyDocument;

  // Optional output with custom properties of the String, Number or Boolean type.
  if (context) authResponse.context = context;
  return authResponse;
}

/**
 * Given the ARN for one of the authenticated API Gateway resources,
 * return an array describing all of the resources an authenticated
 * user should have access to.
 * @param resourceArn 
 */
function makeApprovedResourcesArray(resourceArn:string) {
  // This line grabs the first part of the resource's ARN, which
  // just describes the API Gateway as a whole, and then adds a
  // '/*' to say that the permission works for any deployment stage.
  let baseApiArn = `${resourceArn.split('/')[0]}/*`;

  // The base ARN already has "[API Gateway]/[stage]", so
  // now we just add ".../[method]/[path]".  This says
  // that authenticated users can GET the base "/deployments"
  // and use any method on "/deployments/*"
  return [
    `${baseApiArn}/GET/${RootResources.deployments}`,
    `${baseApiArn}/*/${RootResources.deployments}/*`
  ]
}

export default TokenCheck;
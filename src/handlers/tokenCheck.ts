import { makeAppGitHub, makeUserGitHub } from '../services/github';
import { APIGatewayAuthorizerEvent } from '@eximchain/api-types/spec/events';
import { githubClientId } from '../env';

const TokenCheck = async (event: APIGatewayAuthorizerEvent, content: any, callback: Function) => {
  const token = event.authorizationToken as string;
  try {
    // If this await resolves, the token is valid.
    const GitHub = makeAppGitHub();
    const tokenInfo = await GitHub.apps.checkToken({ access_token: token, client_id: githubClientId })
    callback(null, generatePolicy('user', 'Allow', event.methodArn, {
      // Including this ensures that the authorized handler (deployStart)
      // already has all of the user's profile data (username, email, 
      // repo url) right when it's executed.
      githubTokenInfo: JSON.stringify(tokenInfo)
    }))
  } catch (err) {
    console.log('Error on token check: ', err);
    // TODO: Validate we got a 404, log actual errors differently
    callback("Error: Invalid Token");
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
var generatePolicy = function (principalId: string, effect: 'Allow' | 'Deny', resource: string, context?: AuthContext) {
  var authResponse = {} as AuthorizerResponse;

  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument: PolicyDocument = {
      Version: '2012-10-17',
      Statement: [{
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource
      }]
    };
    authResponse.policyDocument = policyDocument;
  }

  // Optional output with custom properties of the String, Number or Boolean type.
  if (context) authResponse.context = context;
  return authResponse;
}

export default TokenCheck;
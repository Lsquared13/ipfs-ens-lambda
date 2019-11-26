import { makeAppGitHub, makeUserGitHub } from '../services/github';
import { APIGatewayAuthorizerEvent } from '@eximchain/api-types/spec/events';
import { githubClientId, authorizedMethods } from '../env';

const TokenCheck = async (event: APIGatewayAuthorizerEvent, context: any, callback: Function) => {
  const token = event.authorizationToken as string;
  try {
    // If this await resolves, the token is valid.
    const GitHub = makeUserGitHub(token);
    console.log(`Attempting to check following access_token: ${token}`);
    
    const userInfo = await GitHub.users.getAuthenticated();
    console.log('Found following userInfo: ',userInfo);
    callback(null, generatePolicy('user', 'Allow', {
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
var generatePolicy = function (principalId: string, effect: 'Allow' | 'Deny', context?: AuthContext) {
  var authResponse = {} as AuthorizerResponse;
  var methods:string[] = JSON.parse(authorizedMethods);
  console.log('methods in generatePolicy: ',methods);
  console.log('typeof methods: ',typeof methods);
  authResponse.principalId = principalId;
  if (effect) {
    const policyDocument: PolicyDocument = {
      Version: '2012-10-17',
      Statement: methods.map(methodArn => ({
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: methodArn
      }))
    };
    authResponse.policyDocument = policyDocument;
  }

  // Optional output with custom properties of the String, Number or Boolean type.
  if (context) authResponse.context = context;
  return authResponse;
}

export default TokenCheck;
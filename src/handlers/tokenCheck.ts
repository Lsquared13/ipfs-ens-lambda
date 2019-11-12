import GitHub from '../services/github';
import { githubClientId } from '../env';

// My model for a simple token-based Lambda Authorizer function
// is based off of these docs: https://github.com/awsdocs/amazon-api-gateway-developer-guide/blob/master/doc_source/apigateway-use-lambda-authorizer.md#example-create-a-token-based-lambda-authorizer-function
const TokenCheck = async (event:any, content:any, callback:Function) => {
  const token = event.authorizationToken as string;
  try {
      const tokenCheck = await GitHub.apps.checkToken({ access_token: token, client_id: githubClientId })
      // Assumption is that awaiting a 404 (which is what happens when token is invalid)
      // will also throw an error, so this try-catch handles the logic.
      callback(null, generatePolicy('user', 'Allow', event.methodArn))
  } catch (err) {
    console.log('Error on token check: ',err);
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

// This interfaace is based on the API Gateway Custom Authorizer
// docs found here: https://github.com/awsdocs/amazon-api-gateway-developer-guide/blob/master/doc_source/api-gateway-lambda-authorizer-output.md
interface AuthorizerResponse {
  principalId: string
  policyDocument?: PolicyDocument
  context?:Record<string, string|number|boolean>
}
// Help function to generate an IAM policy, courtesy of
// https://github.com/awsdocs/amazon-api-gateway-developer-guide/blob/master/doc_source/apigateway-use-lambda-authorizer.md#example-create-a-token-based-lambda-authorizer-function
var generatePolicy = function(principalId:string, effect:'Allow'|'Deny', resource:string) {
  var authResponse = {} as AuthorizerResponse;
  
  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument:PolicyDocument = {
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
  // authResponse.context = {
  //     "stringKey": "stringval",
  //     "numberKey": 123,
  //     "booleanKey": true
  // };
  return authResponse;
}

export default TokenCheck;
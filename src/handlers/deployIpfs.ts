import { IPFS } from '../services';
import { 
  ResponseOptions, isHttpMethod, userErrorResponse, successResponse, 
  unexpectedErrorResponse
} from '@eximchain/dappbot-types/spec/responses';
import { APIGatewayEvent } from '../types/lambda-types/api-gateway-event-type';

const DeployIpfs = async(event:APIGatewayEvent) => {
  console.log("ipfsDeployHandler request: "+JSON.stringify(event));
  console.log("NOT IMPLEMENTED");
  let responseOpts: ResponseOptions ={}
    let method = event.httpMethod.toUpperCase();
    if(!isHttpMethod(method)) return userErrorResponse({
        message: `unrecognized HttpMethod: ${method}`
    })

    let path = event.requestContext.path;
    let parameters = event.pathParameters;
    // let zipFolder = fetchCode()
    switch(method) {
        case 'POST':
            try {
                // responseOpts.isCreate = true;
                //TODO: Compress zip
                // let compressed = IPFS.zip.compress();
                //TODO: Get hash for compressed zip
                // let hash = IPFS.zip.hash();
                //TODO: Upload compressed zip
                // let upload = IPFS.deploy(compressed);
                //TODO: verify upload before returning
                // let result = await IPFS.confirmDeploy(hash);
                return successResponse({hash:'D3ADB33F'}, responseOpts);
            } catch (err) {
                return unexpectedErrorResponse(err);
            }
        case 'PUT':
            return userErrorResponse({
                message: `UNIMPLEMENTED HttpMethod ${event.httpMethod}`
            });
        case 'DELETE':
            return userErrorResponse({
                message: `UNIMPLEMENTED HttpMethod ${event.httpMethod}`
            });
        case 'GET':
            return userErrorResponse({
                message: `UNIMPLEMENTED HttpMethod ${event.httpMethod}`
            });
        case 'OPTIONS':
            // Auto-return success for CORS pre-flight OPTIONS requests
            return successResponse(undefined);
        default:
            return userErrorResponse({
                message: `Unrecognized HttpMethod ${event.httpMethod}`
            });
    }
}

export default DeployIpfs;
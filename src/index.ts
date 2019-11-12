'use strict';
import {APIGatewayEvent} from './gateway-event-type'
import {ResponseOptions, isHttpMethod, userErrorResponse, successResponse, unexpectedErrorResponse} from './types'

import api from "./api"

exports.startDeployHandler = async(event:APIGatewayEvent) => {
    console.log("startDeployHandler request: "+JSON.stringify(event));
    console.log("NOT IMPLEMENTED");
}

exports.ipfsDeployHandler = async(event:APIGatewayEvent) => {
    console.log("ipfsDeployHandler request: "+JSON.stringify(event));
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
                responseOpts.isCreate = true;
                //TODO: Compress zip
                let compressed = api.ipfs.zip.compress();
                //TODO: Get hash for compressed zip
                let hash = api.ipfs.zip.hash();
                //TODO: Upload compressed zip
                let upload = api.ipfs.deploy(compressed);
                //TODO: verify upload before returning
                let result = await api.ipfs.confirmDeploy(hash);
                return successResponse({hash}, responseOpts);
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

exports.ensDeployHandler = async(event:APIGatewayEvent) => {
    console.log("ensDeployHandler request: "+JSON.stringify(event));
    console.log("NOT IMPLEMENTED");
}

exports.confirmDeployHandler = async(event:APIGatewayEvent) => {
    console.log("confirmDeployHandler request: "+JSON.stringify(event));
    console.log("NOT IMPLEMENTED");
}
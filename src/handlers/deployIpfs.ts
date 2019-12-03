import { CodePipeline, S3, SQS , DynamoDB} from '../services';
import { ResponseOptions } from '@eximchain/api-types/spec/responses';
import { CodePipelineEvent } from '@eximchain/api-types/spec/events';
import  ipfs from '../services/ipfs'
import {logSuccess} from "../common"

const DeployIpfs = async (event: CodePipelineEvent) => {
    let responseOpts: ResponseOptions = {}
    console.log("ipfsDeployHandler request: " + JSON.stringify(event));
    
    let pipelineJob  = event['CodePipeline.job'];
    let { data, id } = pipelineJob;
    
    const { artifactCredentials, inputArtifacts, actionConfiguration } = data;
    // NOTE: Get Dapp ENS name from here add to codepipeline as action configuration for user parameters
    const { EnsName } = JSON.parse(actionConfiguration.configuration.UserParameters);
    let artifactLocation = inputArtifacts[0].location.s3Location;

    try {
        //NOTE: Compress zip ? assume its already compressed see if can optimize based on initial compression algo
        let artifact = await S3.downloadArtifact(artifactLocation, artifactCredentials);
        let result = await ipfs.create(artifact);
        console.log('Result from ipfs.create: ',result);
        const {path, hash, size} = result;
        logSuccess("IPFS UPLOAD", hash);
        if(path && hash && size){
            //NOTE: SEND SSQS MESSAGE TO START ENS TRANSACTION CHAIN, KEYED BY ENS NAME TO FETCH DDB state
            let sqsMessageBody = {
                //TODO: extract out magic to types
                Method : "DeployEns",
                EnsName : EnsName
              }
            await DynamoDB.addIpfsTransition(EnsName, hash);
            await SQS.sendMessage("DeployEns", JSON.stringify(sqsMessageBody));
            return await CodePipeline.completeJob(id);
        }
        console.log('IPFS Pin provided no response.');
        console.log('path: ',path);
        console.log('hash: ',hash);
        console.log('size: ',size);
        throw new Error('did not recieve response from ipfs add with pin, try again later could be Infura');
    } catch (err) {
        //TODO: Write failures to a retry queue?
        return await CodePipeline.failJob(id, err);
    }
}

export default DeployIpfs;
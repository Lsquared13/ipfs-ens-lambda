import { CodePipeline, S3, SQS , DynamoDB} from '../services';
import { ResponseOptions } from '@eximchain/api-types/spec/responses';
import { CodePipelineEvent } from '@eximchain/api-types/spec/events';
import ipfs from '../services/ipfs'
import {logSuccess} from "../common"
import { Transitions } from '@eximchain/ipfs-ens-types/spec/deployment';

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
        let artifactZipStream = await S3.downloadArtifact(artifactLocation, artifactCredentials);
        console.log('Stream from s3.downloadArtifact: ',artifactZipStream);
        let result = await ipfs.create(artifactZipStream);
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
            await SQS.sendMessage("DeployEns", JSON.stringify(sqsMessageBody));
            await DynamoDB.addIpfsTransition(EnsName, hash);
            return await CodePipeline.completeJob(id);
        }
        console.log('IPFS Pin provided no response.');
        console.log('path: ',path);
        console.log('hash: ',hash);
        console.log('size: ',size);
        throw new Error('did not recieve response from ipfs add with pin, try again later could be Infura');
    } catch (err) {
        //TODO: Write failures to a retry queue?

        await DynamoDB.setTransitionErr(EnsName, Transitions.Names.All.IPFS, err.toString());
        return await CodePipeline.failJob(id, err);
    }
}

export default DeployIpfs;
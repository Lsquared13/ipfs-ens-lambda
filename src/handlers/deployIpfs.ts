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
        let result = await ipfs.create(artifactZipStream);
        console.log('Result from ipfs.create: ',result);
        const {hash, size} = result;
        logSuccess("IPFS UPLOAD", hash);
        if(hash && size){
            await DynamoDB.addIpfsTransition(EnsName, hash);
            await SQS.sendMessage(EnsName);
            return await CodePipeline.completeJob(id);
        } else {
            console.log('IPFS Pin provided no response.');
            console.log('hash: ',hash);
            console.log('size: ',size);
            throw new Error('did not recieve response from ipfs add with pin, try again later could be Infura');
        }
    } catch (err) {
        //TODO: Write failures to a retry queue?
        console.log('Error on deployIPFS: ',err);
        await DynamoDB.setTransitionErr(EnsName, Transitions.Names.All.IPFS, err.toString());
        return await CodePipeline.failJob(id, err);
    }
}

export default DeployIpfs;
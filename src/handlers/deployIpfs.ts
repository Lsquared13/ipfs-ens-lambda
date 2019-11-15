import { CodePipeline, S3,sqs } from '../services';
import { ResponseOptions } from '@eximchain/dappbot-types/spec/responses';
import { CodePipelineEvent } from '../types/lambda-event-types';
import  ipfsClient from 'ipfs-http-client'

const DeployIpfs = async (event: CodePipelineEvent) => {
    let responseOpts: ResponseOptions = {}
    console.log("ipfsDeployHandler request: " + JSON.stringify(event));
    
    let pipelineJob  = event['CodePipeline.job'];
    let { data, id } = pipelineJob;
    
    const { artifactCredentials, inputArtifacts, actionConfiguration } = data;
    // TODO: Get Dapp DNS from here
    const { EnsName } = JSON.parse(actionConfiguration.configuration.UserParameters);
    let artifactLocation = inputArtifacts[0].location.s3Location;

    try {
        //TODO: Compress zip ? assume its already compressed see if can optimize based on initial compression algo
        let artifact = await S3.downloadArtifact(artifactLocation, artifactCredentials);

        //TODO: refactor into IPFS service 
        var ipfs = ipfsClient('ipfs.infura.io', '5001', { protocol: 'https' })
        let prehash = await ipfs.add(artifact,{onlyHash:true});
        let result = await ipfs.add(artifact,{pin:true});
        const {path, hash, size} = result[0];
        if(path && hash && size){
            //TODO: SEND SSQS MESSAGE TO START ENS TRANSACTION CHAIN, KEYED BY ENS NAME TO FETCH DDB state
            let sqsMessageBody = {
                //TODO: extract out magic numbers to types
                Method : "DeployEns",
                EnsName : EnsName
              }
            sqs.sendMessage("DeployEns", JSON.stringify(sqsMessageBody));
            return await CodePipeline.completeJob(id);
        }
        throw new Error('did not recieve response from ipfs add with pin, try again later could be Infura');
    } catch (err) {
        //TODO: Write failures to a retry queue?
        return await CodePipeline.failJob(id, err);
    }
}

export default DeployIpfs;
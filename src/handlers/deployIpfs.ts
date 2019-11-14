import { CodePipeline } from '../services';
import { ResponseOptions } from '@eximchain/dappbot-types/spec/responses';
import { CodePipelineEvent } from '../types/lambda-event-types';

const DeployIpfs = async (event: CodePipelineEvent) => {
    console.log("DeployIpfs request: " + JSON.stringify(event));
    console.warn("NOT IMPLEMENTED");
    let responseOpts: ResponseOptions = {}
    let pipelineJob = event['CodePipeline.job'];
    let { data, id } = pipelineJob;
    const { actionConfiguration, inputArtifacts } = data;
    try {
        // TODO: Get zipped build's S3 location from `inputArtifacts`
        
        // TODO: Compress zip
        // let compressed = IPFS.zip.compress();

        // TODO: Get hash for compressed zip
        // let hash = IPFS.zip.hash();

        // TODO: Upload compressed zip
        // let upload = IPFS.deploy(compressed);

        // TODO: verify upload before returning
        // let result = await IPFS.confirmDeploy(hash);
        return await CodePipeline.completeJob(id);
    } catch (err) {
        return await CodePipeline.failJob(id, err);
    }
}

export default DeployIpfs;
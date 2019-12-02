import { CodePipeline, DynamoDB, S3 } from '../services';
import { ResponseOptions } from '@eximchain/api-types/spec/responses';
import { CodePipelineEvent } from '@eximchain/api-types/spec/events';
import { Transitions } from '@eximchain/ipfs-ens-types/spec/deployment';

const PipelineTransition = async (event: CodePipelineEvent) => {
    let responseOpts: ResponseOptions = {}
    console.log("ipfsDeployHandler request: " + JSON.stringify(event));
    
    let pipelineJob  = event['CodePipeline.job'];
    let { data, id } = pipelineJob;
    
    const { artifactCredentials, inputArtifacts, actionConfiguration } = data;
    const { EnsName, TransitionName } = JSON.parse(actionConfiguration.configuration.UserParameters);
    let artifactLocation = inputArtifacts[0].location.s3Location;
    let artifactSize = await S3.checkSize(artifactLocation);
    // AWS can't guarantee that the object is present, so the underlying ContentLength
    // may be undefined.  We ensure it's a number here just so Typescript doesn't complain.
    artifactSize = artifactSize || -1;
    try {
        switch (TransitionName) {
            case Transitions.Names.All.SOURCE:
                await DynamoDB.addSourceTransition(EnsName, artifactSize);
                break;
            case Transitions.Names.All.BUILD:
                await DynamoDB.addBuildTransition(EnsName, artifactSize);
                break;
            default:
                throw Error(`Unrecognized TransitionName: ${TransitionName}`);
        }
        return await CodePipeline.completeJob(id);
    } catch (err) {
        return await CodePipeline.failJob(id, err);
    }
}

export default PipelineTransition;
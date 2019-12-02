import { CodePipeline, DynamoDB} from '../services';
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

    try {
        switch (TransitionName) {
            case Transitions.Names.All.SOURCE:
                await DynamoDB.addSourceTransition(EnsName, 0); //TODO: size
                break;
            case Transitions.Names.All.BUILD:
                await DynamoDB.addBuildTransition(EnsName, 0); //TODO: size
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
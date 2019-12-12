import { CodePipeline, DynamoDB, S3, StageCompletionCloudwatchEvent } from '../services';
import { ResponseOptions } from '@eximchain/api-types/spec/responses';
import { CodePipelineEvent } from '@eximchain/api-types/spec/events';
import { Transitions } from '@eximchain/ipfs-ens-types/spec/deployment';

const TransitionNames = Transitions.Names.All;

const PipelineTransition = async (event: StageCompletionCloudwatchEvent) => {
    let responseOpts: ResponseOptions = {}
    console.log("pipelineTransition request: " + JSON.stringify(event));
    const pipelineArn = event.resources[0];

    // TODO: How do we go from pipelineArn to EnsName??
    const EnsName = 'TODO:'

    // TODO: Use tags or something to verify that the event is coming
    // from a pipeline created by this system.  We make a lot of pipelines,
    // gotta distinguish between them somehow.  In the meantime, just checking
    // to see if the stage names match up.
    const stageName = event.detail.stage;
    if (
        stageName !== TransitionNames.SOURCE &&
        stageName !== TransitionNames.BUILD &&
        stageName !== TransitionNames.IPFS
    ) {
        // This event isn't coming off of the pipelines we care about
        return;
    }
    const success = event.detail.state === 'SUCCEEDED';
    console.log(`It looks like ${stageName} ${success ? 'worked' : 'failed'} on ${pipelineArn}`);

    if (!success) {
        const errMsg = 'TODO: Retrieve the error from the failed action'
        await DynamoDB.setTransitionErr(EnsName, stageName, errMsg);
        return;
    }

    if (stageName === TransitionNames.SOURCE) {
        // TODO: Get the size of their fetched source (input artifact)
        //
        // let artifactLocation = inputArtifacts[0].location.s3Location;
        // let artifactSize = await S3.checkSize(artifactLocation);
        // // AWS can't guarantee that the object is present, so the underlying ContentLength
        // // may be undefined.  We ensure it's a number here just so Typescript doesn't complain.

        let sourceSize = -1;
        await DynamoDB.addSourceTransition(EnsName, sourceSize)
    } else {
        // TODO: Get the size of the built site (output artifact)
        let buildSize = -1;
        await DynamoDB.addBuildTransition(EnsName, buildSize);
    }
    
    return;
    // let pipelineJob  = event['CodePipeline.job'];
    // let { data, id } = pipelineJob;

    // try {
    //     const { artifactCredentials, inputArtifacts, actionConfiguration } = data;
    //     const { EnsName, TransitionName } = JSON.parse(actionConfiguration.configuration.UserParameters);
        // let artifactLocation = inputArtifacts[0].location.s3Location;
        // let artifactSize = await S3.checkSize(artifactLocation);
        // // AWS can't guarantee that the object is present, so the underlying ContentLength
        // // may be undefined.  We ensure it's a number here just so Typescript doesn't complain.
        // artifactSize = artifactSize || -1;
    //     switch (TransitionName) {
    //         case Transitions.Names.All.SOURCE:
    //             await DynamoDB.addSourceTransition(EnsName, artifactSize);
    //             break;
    //         case Transitions.Names.All.BUILD:
    //             await DynamoDB.addBuildTransition(EnsName, artifactSize);
    //             break;
    //         default:
    //             throw Error(`Unrecognized TransitionName: ${TransitionName}`);
    //     }
    //     return await CodePipeline.completeJob(id);
    // } catch (err) {
    //     console.log('Error on pipelineTransition: ',err);
    //     return await CodePipeline.failJob(id, err);
    // }
}

export default PipelineTransition;
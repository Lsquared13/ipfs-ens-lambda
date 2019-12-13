import { CodePipeline, DynamoDB, S3, StageCompletionCloudwatchEvent } from '../services';
import { ResponseOptions } from '@eximchain/api-types/spec/responses';
import { CodePipelineEvent } from '@eximchain/api-types/spec/events';
import { Transitions, DeployItem } from '@eximchain/ipfs-ens-types/spec/deployment';

const TransitionNames = Transitions.Names.All;

const PipelineTransition = async (event: StageCompletionCloudwatchEvent) => {
    let responseOpts: ResponseOptions = {}
    console.log("pipelineTransition request: " + JSON.stringify(event));
    const pipelineArn = event.resources[0];
    const stageName = event.detail.stage;

    // Pipeline name is the last element of the ARN when split on ':'
    const arnParts = pipelineArn.split(':')
    const pipelineName = arnParts[arnParts.length - 1];
    console.log('Querying with pipelineName: ',pipelineName);
    const item = await DynamoDB.getDeployItemByPipeline(pipelineName);

    // If there's no DeployItem, then the event must be coming from a
    // pipeline we didn't create, and can be safely ignored.
    if (!item) return;
    // Only keep processing the event if it's about the two stages
    // which this Lambda is responsible for
    if (![TransitionNames.SOURCE, TransitionNames.BUILD].includes(stageName)) return;

    const EnsName = item.ensName;
    const allActions = await CodePipeline.getActions(pipelineName);
    if (!allActions.actionExecutionDetails) {
        console.log('Unable to find any action executions for pipeline: ',pipelineName);
        return;
    };
    const thisAction = allActions.actionExecutionDetails.find((elt) => {
        return elt.stageName === stageName;
    })
    if (!thisAction) {
        console.log('Found some action executions, but none matching the stage of the event we just heard about');
        return;
    }
    

    const success = event.detail.state === 'SUCCEEDED';
    console.log(`It looks like ${stageName} ${success ? 'worked' : 'failed'} on ${pipelineArn}`);

    if (event.detail.state === 'FAILED') {
        let errMsg = thisAction?.output?.executionResult?.externalExecutionSummary || `Failed to complete ${stageName}.`
        await DynamoDB.setTransitionErr(EnsName, stageName, errMsg);
        return;
    }

    console.log('This is what our successful action looked like:');
    console.log(thisAction);

    if (!(thisAction.output && thisAction.output.outputArtifacts)) {
        console.log('Source action allegedly had no output artifacts');
        return;
    }
    let artifactLocation = thisAction.output.outputArtifacts[0].s3location;
    if (!artifactLocation) throw new Error(`The output artifact we found had no s3Location value`);
    let artifactSize = await S3.checkSize(artifactLocation);
    if (stageName === TransitionNames.SOURCE) {
        await DynamoDB.addSourceTransition(EnsName, artifactSize)
    } else {
        await DynamoDB.addBuildTransition(EnsName, artifactSize);
    }
    return;
}

// let artifactLocation = inputArtifacts[0].location.s3Location;
// let artifactSize = await S3.checkSize(artifactLocation);
// // AWS can't guarantee that the object is present, so the underlying ContentLength
// // may be undefined.  We ensure it's a number here just so Typescript doesn't complain.

export default PipelineTransition;
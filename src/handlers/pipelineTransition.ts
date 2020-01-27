import { CodePipeline, DynamoDB, S3, StageCompletionCloudwatchEvent } from '../services';
import { Transitions } from '@eximchain/ipfs-ens-types/spec/deployment';

const TransitionNames = Transitions.Names.All;

const PipelineTransition = async (event: StageCompletionCloudwatchEvent) => {
    console.log("pipelineTransition request: " + JSON.stringify(event));
    // Cloudwatch notifications from CodePipeline always come from one
    // resource: the pipeline which just had a state transition.
    const pipelineArn = event.resources[0];
    const stageName = event.detail.stage;

    // Pipeline name is the last element of the ARN when split on ':'
    const arnParts = pipelineArn.split(':')
    const pipelineName = arnParts[arnParts.length - 1];
    const item = await DynamoDB.getDeployItemByPipeline(pipelineName);

    if (!item) {
        // If there's no DeployItem, then the event must be coming from a
        // pipeline we didn't create, and can be safely ignored.
        console.log(`Bailing Out: Received event from pipeline ${pipelineName}, but could not find a corresponding DeployItem.`)
        return;
    };

    if (![TransitionNames.SOURCE, TransitionNames.BUILD].includes(stageName)) {
        // Only keep processing the event if it's about the two stages
        // which this Lambda is responsible for
        console.log(`Bailing Out: Event is from an unrecognized stage: ${stageName}`);
        return;
    }

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

    if (event.detail.state === 'FAILED') {
        let errMsg = `Failed to complete ${stageName}.`
        if (thisAction.output && thisAction.output.executionResult && thisAction.output.executionResult.externalExecutionSummary) {
            errMsg = thisAction.output.executionResult.externalExecutionSummary;
        }
        await DynamoDB.setTransitionErr(EnsName, stageName, errMsg);
        return;
    }

    if (!(thisAction.output && thisAction.output.outputArtifacts)) {
        console.log('Source action allegedly had no output artifacts');
        return;
    }
    // Source and build stages each have only one output artifact; grab it to get the S3 location
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

export default PipelineTransition;
import {
  AWS, pipelineRoleArn, artifactBucket, deploySeedBucket, codebuildBuildId,
  deployIpfsFxnName
} from '../env';
import { CreatePipelineInput } from 'aws-sdk/clients/codepipeline';
import { addAwsPromiseRetries } from '../common';
import { DeploySeed } from '../types';

const codepipeline = new AWS.CodePipeline();

export const CodePipeline = {
  create: promiseCreatePipeline,
  createDeploy: promiseCreateDeployPipeline,
  run: promiseRunPipeline,
  delete: promiseDeletePipeline,
  completeJob: promiseCompleteJob,
  failJob: promiseFailJob
}

export default CodePipeline;

/**
 * Generalized function to create any CodePipeline
 * on our account.
 * @param params 
 */
function promiseCreatePipeline(params: CreatePipelineInput) {
  let maxRetries = 5;
  return addAwsPromiseRetries(() => codepipeline.createPipeline(params).promise(), maxRetries);
}

/**
 * Specific function for creating CodePipelines which
 * build from GitHub and deploy to IPFS.
 * @param pipelineName 
 * @param seed 
 * @param oauthGithubToken 
 */
function promiseCreateDeployPipeline(pipelineName: string, seed: DeploySeed, oauthGithubToken: string) {
  return promiseCreatePipeline(DeployPipelineParams(pipelineName, seed, oauthGithubToken))
}

function promiseRunPipeline(pipelineName: string) {
  let maxRetries = 5;
  let params = {
    name: pipelineName
  };
  return addAwsPromiseRetries(() => codepipeline.startPipelineExecution(params).promise(), maxRetries);
}

function promiseDeletePipeline(pipelineName: string) {
  let maxRetries = 5;
  let params = {
    name: pipelineName
  };
  return addAwsPromiseRetries(() => codepipeline.deletePipeline(params).promise(), maxRetries);
}

function promiseCompleteJob(jobId: string) {
  let maxRetries = 5;
  let params = {
    jobId: jobId
  }
  return addAwsPromiseRetries(() => codepipeline.putJobSuccessResult(params).promise(), maxRetries);
}

function promiseFailJob(jobId: string, err: any) {
  let maxRetries = 5;
  let params = {
    jobId: jobId,
    failureDetails: {
      type: 'JobFailed',
      message: JSON.stringify(err)
    }
  }
  return addAwsPromiseRetries(() => codepipeline.putJobFailureResult(params).promise(), maxRetries);
}

function DeployPipelineParams(pipelineName: string, seed: DeploySeed, oauthGithubToken: string): CreatePipelineInput {
  const { ensName, owner, repo, branch } = seed;
  return {
    pipeline: {
      name: pipelineName,
      roleArn: pipelineRoleArn,
      version: 1,
      artifactStore: {
        location: artifactBucket,
        type: 'S3'
      },
      stages: [
        {
          name: 'Fetch Deploy Seed',
          actions: [
            {
              "name": "Source",
              "actionTypeId": {
                "category": "Source",
                "owner": "AWS",
                "version": "1",
                "provider": "S3"
              },
              "outputArtifacts": [
                {
                  "name": "DEPLOYSEED"
                }
              ],
              "configuration": {
                "S3Bucket": deploySeedBucket,
                "S3ObjectKey": `${ensName}/seed.json`
              },
              "runOrder": 1
            }
          ]
        },
        {
          name: 'Fetch Source',
          "actions": [
            {
              "name": "Source",
              "actionTypeId": {
                "category": "Source",
                "owner": "ThirdParty",
                "version": "1",
                "provider": "GitHub"
              },
              "outputArtifacts": [
                {
                  "name": "SOURCE"
                }
              ],
              "configuration": {
                "Owner": owner,
                "Repo": repo,
                "Branch": branch,
                "OAuthToken": oauthGithubToken
              },
              "runOrder": 1
            }
          ]

        },
        {
          "name": "BuildSource",
          "actions": [
            {
              "inputArtifacts": [
                {
                  "name": "SOURCE"
                },
                {
                  "name": "DEPLOYSEED"
                }
              ],
              "name": "Build",
              "actionTypeId": {
                "category": "Build",
                "owner": "AWS",
                "version": "1",
                "provider": "CodeBuild"
              },
              "outputArtifacts": [
                {
                  "name": "BUILD"
                }
              ],
              "configuration": {
                "ProjectName": codebuildBuildId
              },
              "runOrder": 1
            }
          ]
        },
        {
          "name": "DeployIPFS",
          "actions": [
            {
              "name": "Deploy",
              "inputArtifacts": [
                {
                  "name": "BUILD"
                }
              ],
              "actionTypeId": {
                "category": "Invoke",
                "owner": "AWS",
                "version": "1",
                "provider": "Lambda"
              },
              "configuration": {
                "FunctionName": deployIpfsFxnName
              }
            }
          ]
        }
      ]
    }
  }
}
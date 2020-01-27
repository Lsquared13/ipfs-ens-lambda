import {
  AWS, pipelineRoleArn, artifactBucket, codebuildBuildId,
  deployIpfsFxnName, transitionFxnName
} from '../env';
import { CreatePipelineInput } from 'aws-sdk/clients/codepipeline';
import { addAwsPromiseRetries } from '../common';
import { Transitions } from '@eximchain/ipfs-ens-types/spec/deployment';
import { StringMapping } from '@eximchain/api-types/spec/common';

const codepipeline = new AWS.CodePipeline();

export const CodePipeline = {
  create: promiseCreatePipeline,
  createDeploy: promiseCreateDeployPipeline,
  getActions: promiseGetActionExecutions,
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
 * @param ensName
 * @param pipelineName 
 * @param buildDir
 * @param oauthGithubToken 
 * @param owner
 * @param repo
 * @param branch
 * @param commitRef
 * @param envVars
 */
function promiseCreateDeployPipeline(ensName: string, pipelineName: string, packageDir: string, buildDir: string, oauthGithubToken: string, owner: string, repo: string, branch: string, commitRef: string, envVars: StringMapping) {
  return promiseCreatePipeline(DeployPipelineParams(ensName, pipelineName, packageDir, buildDir, oauthGithubToken, owner, repo, branch, commitRef, envVars))
}

function promiseGetActionExecutions(pipelineName:string) {
  let maxRetries = 5;
  let params = {
    pipelineName: pipelineName,
  }
  return addAwsPromiseRetries(() => codepipeline.listActionExecutions(params).promise(), maxRetries);
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

/**
 * Accepts a flat mapping of env vars and converts it to a comma separated string of lines formatted for a .env file.
 * 
 * e.g.: { KEY_1: "val1", KEY_2: "val2"} is serialized to 'KEY_1="val1",KEY_2="val2"'
 * @param envVars
 */
function serializeEnvVars(envVars: StringMapping) {
  let envStrings = Object.entries(envVars).map(([key, val]) => `${key}="${val}"`);
  return envStrings.join(',');
}

function DeployPipelineParams(
  ensName: string,
  pipelineName: string,
  packageDir: string,
  buildDir: string,
  oauthGithubToken: string,
  owner: string,
  repo: string,
  branch: string,
  commitRef: string,
  envVars: StringMapping
): CreatePipelineInput {
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
          "name": Transitions.Names.All.SOURCE,
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
          "name": Transitions.Names.All.BUILD,
          "actions": [
            {
              "inputArtifacts": [
                {
                  "name": "SOURCE"
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
                "ProjectName": codebuildBuildId,
                "EnvironmentVariables": JSON.stringify(
                  [
                    {
                      name: 'BUILD_DIR',
                      value: buildDir
                    },
                    {
                      name: 'PACKAGE_DIR',
                      value: packageDir
                    },
                    {
                      name: 'COMMIT',
                      value: commitRef
                    },
                    {
                      name: 'ENV_VARS',
                      value: serializeEnvVars(envVars)
                    }
                  ]
                )
              },
              "runOrder": 1
            }
          ]
        },
        {
          "name": Transitions.Names.All.IPFS,
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
                      "FunctionName": deployIpfsFxnName,
                      "UserParameters": JSON.stringify({
                          EnsName:  ensName
                      })
                  }
              }
          ]
        }
      ]
    }
  }
}

const StageTransitionEventSample = {
  "version": "0",
  "id": "CWE-event-id",
  "detail-type": "CodePipeline Stage Execution State Change",
  "source": "aws.codepipeline",
  "account": "123456789012",
  "time": "2017-04-22T03:31:47Z",
  "region": "us-east-1",
  "resources": [
    "arn:aws:codepipeline:us-east-1:123456789012:pipeline:myPipeline"
  ],
  "detail": {
    "pipeline": "myPipeline",
    "version": "1",
    "execution-id": "01234567-0123-0123-0123-012345678901",
    "stage": "Prod",
    "state": "STARTED"
  }
}

/**
 * This interface combines the shape of all Stage Execution
 * Cloudwatch events (shown above) with the specific details
 * we can guarantee.  Our stage names now use the enum, so we
 * know the possible values 
 */
export interface StageCompletionCloudwatchEvent {
  "version": string
  "id": string
  "detail-type": "CodePipeline Stage Execution State Change"
  "source": "aws.codepipeline"
  "account": string
  "time": string
  "region": string
  "resources": string[]
  "detail": {
    "pipeline": string
    "version": string
    "execution-id": string
    "stage": Transitions.Names.Pipeline
    "state": "SUCCEEDED" | "FAILED"
  }
}
import NoConfigAWS from 'aws-sdk';

// Provided automagically by AWS
export const awsRegion = process.env.AWS_REGION as string;

// Provided to us via Terraform
export const ethKey = process.env.ETH_KEY as string;
export const ethAddress = process.env.ETH_ADDRESS as string;
export const ipfsEndpoint = process.env.IPFS_ENDPOINT as string;
export const ensContractAddress = process.env.ENS_CONTRACT_ADDRESS as string;
export const ensRootDomain = process.env.ENS_ROOT_DOMAIN as string;
export const defaultGasPrice = process.env.DEFAULT_GAS_PRICE as string;

// GitHub Variables
export const githubClientId = process.env.GITHUB_CLIENT_ID as string;
export const githubClientSecret = process.env.GITHUB_CLIENT_SECRET as string;

// CodePipeline variables
export const deploySeedBucket = process.env.DEPLOY_SEED_BUCKET as string;
export const pipelineRoleArn = process.env.PIPELINE_ROLE_ARN as string;
export const codebuildBuildId = process.env.CODEBUILD_BUILD_ID as string;
export const deployIpfsFxnName = process.env.SERVICES_LAMBDA_FUNCTION as string;
export const deployTableName = process.env.DEPLOY_TABLE_NAME as string;

NoConfigAWS.config.update({region: awsRegion});

export const AWS = NoConfigAWS;

module.exports = { 
    AWS, awsRegion, ethKey, ipfsEndpoint, ensContractAddress,
    ensRootDomain, defaultGasPrice, githubClientId, 
    githubClientSecret, deploySeedBucket
};
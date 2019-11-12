import NoConfigAWS from 'aws-sdk';

// Provided automagically by AWS
export const awsRegion = process.env.AWS_REGION as string;

// Provided to us via Terraform
export const ethKey = process.env.ETH_KEY as string;

export const githubClientId = process.env.GITHUB_CLIENT_ID as string;
export const githubClientSecret = process.env.GITHUB_CLIENT_SECRET as string;

NoConfigAWS.config.update({region: awsRegion});

export const AWS = NoConfigAWS;

module.exports = { 
    AWS, awsRegion, ethKey, githubClientId
};
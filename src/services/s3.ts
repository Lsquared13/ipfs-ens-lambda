// @ts-ignore Alas, there are no published bindings for node-zip.
import zip from 'node-zip';
import { S3ArtifactLocation, Credentials } from "../types/lambda-event-types";
import { AWS, deploySeedBucket } from '../env';
import { addAwsPromiseRetries } from "../common";
import { DeploySeed } from '../types';

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

function promiseGetS3Object(bucketName:string, objectKey:string) {
  let maxRetries = 5;
  const params = {
      Bucket : bucketName,
      Key : objectKey
  }
  return addAwsPromiseRetries(() => s3.getObject(params).promise(), maxRetries);
}

function promiseGetS3ObjectWithCredentials(bucketName:string, objectKey:string, credentials:Credentials) {
  let maxRetries = 5;
  const params = {
      Bucket : bucketName,
      Key : objectKey
  }

  let credentialClient = new AWS.S3({apiVersion: '2006-03-01', credentials: credentials});

  return addAwsPromiseRetries(() => credentialClient.getObject(params).promise(), maxRetries);
}

async function downloadArtifact(artifactLocation:S3ArtifactLocation, artifactCredentials:Credentials) {
  let getObjectResult = await promiseGetS3ObjectWithCredentials(artifactLocation.bucketName, artifactLocation.objectKey, artifactCredentials);
  console.log("Successfully retrieved artifact: ", getObjectResult);

  let zipArtifact = zip(getObjectResult.Body, {base64: false, checkCRC32: true});
  console.log("Loaded Zip Artifact");

  return zipArtifact;
}

async function putDeploySeed(seed:DeploySeed) {
  let maxRetries = 5;
  let params = {
      Bucket : deploySeedBucket,
      ACL: 'private',
      Key: `${seed.ensName}/seed.json`,
      Body: JSON.stringify(seed, null, 2)
  };
  return addAwsPromiseRetries(() => s3.putObject(params).promise(), maxRetries);
}

export default {
  downloadArtifact, putDeploySeed,
  getObject: promiseGetS3Object,
}
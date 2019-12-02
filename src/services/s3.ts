// @ts-ignore Alas, there are no published bindings for node-zip.
import zip from 'node-zip';
import { S3ArtifactLocation, Credentials } from '@eximchain/api-types/spec/events';
import { AWS } from '../env';
import { addAwsPromiseRetries } from "../common";

const s3 = new AWS.S3({apiVersion: '2006-03-01'});

export const S3 = {
  downloadArtifact,
  getObject: promiseGetS3Object,
  createBucket: promiseCreateS3Bucket,
  checkSize: promiseGetSize
}

export default S3;

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

function promiseCreateS3Bucket(bucketName:string) {
  let maxRetries = 5;
  let params = {
      Bucket: bucketName,
      ACL: 'private'
  };
  return addAwsPromiseRetries(() => s3.createBucket(params).promise(), maxRetries);
}

async function promiseGetSize(location:S3ArtifactLocation):Promise<number | undefined> {
  let maxRetries = 5;
  let params = {
    Bucket: location.bucketName,
    Key: location.objectKey
  }
  const res = await addAwsPromiseRetries(() => s3.headObject(params).promise(), maxRetries);
  return res.ContentLength
}
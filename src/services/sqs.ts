import { AWS, sqsQueue } from '../env';
import { SendMessageRequest } from 'aws-sdk/clients/sqs';
const { addAwsPromiseRetries } = require('../common');

const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

function promiseSendMessage(ensName: string, delaySeconds?: number) {
    let maxRetries = 5;
    let params:SendMessageRequest = {
        QueueUrl: sqsQueue as string,
        MessageBody: ensName,
        MessageAttributes: {
            EnsName: {
                DataType: 'String',
                StringValue: ensName
            }
        }
    };
    if (delaySeconds) params.DelaySeconds = delaySeconds;
    return addAwsPromiseRetries(() => sqs.sendMessage(params).promise(), maxRetries);
}

export const SQS = {
    sendMessage : promiseSendMessage
  }
export default SQS;

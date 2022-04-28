'use strict';

const BUCKET_NAME = process.env.BUCKET_NAME;
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const s3 = new AWS.S3();
const dynamo = new AWS.DynamoDB.DocumentClient();

module.exports.getS3PresignedUrl = async (event) => {
  try {
    const key = uuidv4();
    const email = event.queryStringParameters.email
    const expirationTimeInSeconds = 3600;

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Email is required" }),
      };
    }

    const url = s3.getSignedUrl("putObject", {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: expirationTimeInSeconds,
      ContentType: 'video/mp4',
    });

    await dynamo
      .put({
        TableName: "g4-video-upload-db",
        Item: {
          id: key,
          email
        }
      })
      .promise();

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Headers" : "*",
        "Access-Control-Allow-Origin": "https://d34mdiwu3w0mg2.cloudfront.net",
        "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
    },
      body: JSON.stringify({url})
    }

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
        input: event,
      }),
    };
  }
};

module.exports.downloadVideo = async (event) => {
  try {
    const key = event.queryStringParameters.key
    if (!key) {
      throw new Error('Key is required');
    }
    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      Expires: 60*30,
    };
    const url = s3.getSignedUrl("getObject", params);
    return {
      statusCode: 301,
      headers: {
        Location: url
      },
    };
    
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: error.message,
        input: event,
      }),
    };
  }
}

module.exports.executePayload = async (event) => {
  try {
    const s3Event = event.Records[0].s3;    
    const key = s3Event.object.key;
    const ses = new AWS.SES({ region: "us-east-1" });

    const userData = await dynamo
      .get({
        TableName: "g4-video-upload-db",
        Key: {
          id: key
        }
      })
      .promise();
      
    const params = {
      Destination: {
        ToAddresses: [userData.Item.email],
      },
      Message: {
        Body: {
          Text: { Data: `Link para acessar e baixar o vídeo: https://e1mvw8dhtk.execute-api.us-east-1.amazonaws.com/dev/downloadVideo/?key=${key}` },
        },

        Subject: { Data: "Seu upload terminou!" },
      },
      Source: "rafael.crd98@gmail.com",
    };
    
    await ses.sendEmail(params).promise().then((data) => {
      console.log(data)     
    }).catch((err) => {
      console.error(err)   
    });

  } catch (err) {
    throw new Error(err);
  }
};
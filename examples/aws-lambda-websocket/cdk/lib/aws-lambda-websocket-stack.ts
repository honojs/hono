import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as apigwv2Integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as path from 'path';

export class AwsLambdaWebsocketStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Define the Lambda function
    const fn = new lambdaNodejs.NodejsFunction(this, 'HonoWebSocketHandler', {
      entry: path.join(__dirname, '../../src/handler.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_20_X,
      bundling: {
        minify: true,
        sourceMap: true,
      },
    });

    // Define the WebSocket API
    const webSocketApi = new apigwv2.WebSocketApi(this, 'HonoWebSocketApi', {
      apiName: 'HonoWebSocketApi',
    });

    // Create a WebSocket stage
    new apigwv2.WebSocketStage(this, 'HonoWebSocketStage', {
      webSocketApi,
      stageName: 'dev',
      autoDeploy: true,
    });

    // Create a WebSocket integration for the Lambda function
    const webSocketIntegration = new apigwv2Integrations.WebSocketLambdaIntegration(
      'HonoWebSocketIntegration',
      fn
    );

    // Add routes to the WebSocket API
    // $connect, $disconnect, and $default are the standard routes
    webSocketApi.addRoute('$connect', {
      integration: webSocketIntegration,
    });

    webSocketApi.addRoute('$disconnect', {
      integration: webSocketIntegration,
    });

    webSocketApi.addRoute('$default', {
      integration: webSocketIntegration,
    });

    // Output the WebSocket URL
    new cdk.CfnOutput(this, 'WebSocketURL', {
      value: webSocketApi.apiEndpoint,
      description: 'WebSocket URL',
    });
  }
}

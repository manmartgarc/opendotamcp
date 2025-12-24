import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { Construct } from 'constructs';

export class FastMcpOpendotaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Python Lambda function
    const fastMcpFunction = new PythonFunction(this, 'FastMcpOpendotaFunction', {
      entry: 'python-lambda',
      runtime: lambda.Runtime.PYTHON_3_12,
      timeout: cdk.Duration.seconds(30),
      index: 'lambda_function.py',
      handler: 'handler',
      memorySize: 512,
      environment: {
        POWERTOOLS_SERVICE_NAME: 'fastmcp-opendota',
      },
      bundling: {
        assetExcludes: ['.venv', '__pycache__']
      },
    });

    // Create API key
    const apiKey = new apigateway.ApiKey(this, 'FastMcpApiKey', {
      apiKeyName: 'FastMcpOpendotaApiKey',
      description: 'API Key for FastMCP OpenDota Service',
    });

    // Create usage plan
    const usagePlan = new apigateway.UsagePlan(this, 'FastMcpUsagePlan', {
      name: 'FastMcpOpendotaUsagePlan',
      description: 'Usage plan for FastMCP OpenDota Service',
      throttle: {
        rateLimit: 10,
        burstLimit: 20,
      },
      quota: {
        limit: 1000,
        period: apigateway.Period.DAY,
      },
    });

    // Create API Gateway REST API with response streaming support.
    // This enables both local MCP server access and remote API consumption.
    const api = new apigateway.RestApi(this, 'FastMcpOpendotaApi', {
      restApiName: 'FastMCP OpenDota Service',
      description: 'FastMCP server exposing OpenDota API as MCP tools',
      endpointConfiguration: {
        types: [apigateway.EndpointType.REGIONAL],
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // Create Lambda integration with proxy
    const lambdaIntegration = new apigateway.LambdaIntegration(fastMcpFunction, {
      proxy: true,
    });

    // Add proxy resource to handle all paths with API key requirement
    const proxyResource = api.root.addResource('{proxy+}');
    proxyResource.addMethod('ANY', lambdaIntegration, {
      apiKeyRequired: true,
    });

    // Also handle root path with API key requirement
    api.root.addMethod('ANY', lambdaIntegration, {
      apiKeyRequired: true,
    });

    // Associate API key with usage plan
    usagePlan.addApiKey(apiKey);
    usagePlan.addApiStage({
      stage: api.deploymentStage,
    });
  }
}
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecs_patterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import { Construct } from 'constructs';

export class DevGraphStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC for the application
    const vpc = new ec2.Vpc(this, 'DevGraphVPC', {
      maxAzs: 2,
      natGateways: 1,
    });

    // ElastiCache (Redis-compatible) for FalkorDB
    // Note: FalkorDB is Redis-compatible, so we use ElastiCache
    const redisSecurityGroup = new ec2.SecurityGroup(this, 'RedisSecurityGroup', {
      vpc,
      description: 'Security group for Redis/FalkorDB',
      allowAllOutbound: true,
    });

    const redisSubnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: 'Subnet group for Redis',
      subnetIds: vpc.privateSubnets.map(subnet => subnet.subnetId),
    });

    const redisCluster = new elasticache.CfnCacheCluster(this, 'FalkorDB', {
      cacheNodeType: 'cache.t3.medium',
      engine: 'redis',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [redisSecurityGroup.securityGroupId],
      cacheSubnetGroupName: redisSubnetGroup.ref,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'DevGraphCluster', {
      vpc,
      containerInsights: true,
    });

    // Backend Service with Fargate
    const backendTaskDef = new ecs.FargateTaskDefinition(this, 'BackendTask', {
      memoryLimitMiB: 1024,
      cpu: 512,
    });

    // Use a pre-built image or build separately
    // For initial deployment, we'll use a simple Node.js image
    // You should build and push your image to ECR separately
    const backendContainer = backendTaskDef.addContainer('backend', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/docker/library/node:20-alpine'),
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'devgraph-backend' }),
      command: [
        'sh', '-c',
        'echo "Backend container placeholder - deploy your built image to ECR"'
      ],
      environment: {
        NODE_ENV: 'production',
        PORT: '4000',
        FALKORDB_HOST: redisCluster.attrRedisEndpointAddress,
        FALKORDB_PORT: redisCluster.attrRedisEndpointPort,
        FALKORDB_GRAPH_ID: 'devgraph',
      },
    });

    backendContainer.addPortMappings({
      containerPort: 4000,
    });

    // Application Load Balanced Fargate Service for Backend
    const backendService = new ecs_patterns.ApplicationLoadBalancedFargateService(
      this,
      'BackendService',
      {
        cluster,
        taskDefinition: backendTaskDef,
        publicLoadBalancer: true,
        desiredCount: 1,
        listenerPort: 80,
        healthCheckGracePeriod: cdk.Duration.seconds(60),
      }
    );

    // Allow backend to connect to Redis
    backendService.service.connections.allowTo(
      redisSecurityGroup,
      ec2.Port.tcp(6379),
      'Allow backend to connect to Redis'
    );

    // Configure health check
    backendService.targetGroup.configureHealthCheck({
      path: '/api/health',
      interval: cdk.Duration.seconds(30),
    });

    // S3 bucket for frontend
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html',
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      'OriginAccessIdentity'
    );
    frontendBucket.grantRead(originAccessIdentity);

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(
            backendService.loadBalancer.loadBalancerDnsName,
            {
              protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            }
          ),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
        },
      },
    });

    // Deploy frontend to S3
    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../apps/web/dist')],
      destinationBucket: frontendBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    // Outputs
    new cdk.CfnOutput(this, 'FrontendURL', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'DevGraph Dashboard URL',
    });

    new cdk.CfnOutput(this, 'BackendURL', {
      value: `http://${backendService.loadBalancer.loadBalancerDnsName}`,
      description: 'Backend API URL',
    });

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: `${redisCluster.attrRedisEndpointAddress}:${redisCluster.attrRedisEndpointPort}`,
      description: 'Redis/FalkorDB endpoint',
    });
  }
}

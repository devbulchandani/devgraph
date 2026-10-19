#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { SimpleDevGraphStack } from './simple-stack';

const app = new cdk.App();

// Get AWS account and region from environment or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || '894461833328',
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
};

new SimpleDevGraphStack(app, 'DevGraphStack', {
  env,
  description: 'DevGraph - Frontend Deployment',
});

app.synth();

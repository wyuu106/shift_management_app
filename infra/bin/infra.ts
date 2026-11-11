#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { config, readRuntimeSettings } from '../lib/config';
import { ShiftManagementStack } from '../lib/shift-management-stack';

const app = new cdk.App();

new ShiftManagementStack(app, config.stackName, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: config.region,
  },
  // アセット（Lambdaのコードなど）を使わないので、cdk bootstrapなしでCLIの認証情報から直接デプロイする
  synthesizer: new cdk.LegacyStackSynthesizer(),
  terminationProtection: true,
  settings: readRuntimeSettings((key) => app.node.tryGetContext(key)),
});

import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { config, readRuntimeSettings } from '../lib/config';
import { ShiftManagementStack } from '../lib/shift-management-stack';

function synth(adminCidr?: string): Template {
  const app = new cdk.App();
  const stack = new ShiftManagementStack(app, 'TestStack', {
    env: { account: '123456789012', region: config.region },
    synthesizer: new cdk.LegacyStackSynthesizer(),
    settings: { adminCidr },
  });
  return Template.fromStack(stack);
}

function portsOf(template: Template) {
  const instances = template.findResources('AWS::Lightsail::Instance');
  const [instance] = Object.values(instances);
  return instance.Properties.Networking.Ports as Array<Record<string, unknown>>;
}

test('アプリとDBのポートは公開しない', () => {
  const ports = portsOf(synth('203.0.113.10/32')).map((port) => port.FromPort);

  expect(ports.sort()).toEqual([22, 443, 80].sort());
  expect(ports).not.toContain(8000);
  expect(ports).not.toContain(5432);
});

test('SSHは管理者IPとブラウザSSHだけに許可する', () => {
  const ssh = portsOf(synth('203.0.113.10/32')).find((port) => port.FromPort === 22);

  expect(ssh).toMatchObject({
    Cidrs: ['203.0.113.10/32'],
    Ipv6Cidrs: [],
    CidrListAliases: ['lightsail-connect'],
  });
});

test('管理者IP未指定ならSSHはブラウザSSHのみ', () => {
  const ssh = portsOf(synth()).find((port) => port.FromPort === 22);

  expect(ssh).toMatchObject({ Cidrs: [], CidrListAliases: ['lightsail-connect'] });
});

test('インスタンス・静的IP・バケットはスタック削除時も残す', () => {
  const template = synth();

  for (const type of [
    'AWS::Lightsail::Instance',
    'AWS::Lightsail::StaticIp',
    'AWS::Lightsail::Bucket',
  ]) {
    template.hasResource(type, {
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  }
});

test('起動スクリプトを持たない', () => {
  synth().hasResourceProperties('AWS::Lightsail::Instance', {
    UserData: Match.absent(),
    BlueprintId: config.instance.blueprintId,
    BundleId: config.instance.bundleId,
  });
});

test('不正な管理者IPは拒否する', () => {
  expect(() => readRuntimeSettings(() => '203.0.113.10')).toThrow();
});

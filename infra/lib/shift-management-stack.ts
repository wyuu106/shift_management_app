import * as cdk from 'aws-cdk-lib/core';
import * as lightsail from 'aws-cdk-lib/aws-lightsail';
import { Construct } from 'constructs';
import { config, RuntimeSettings } from './config';

export interface ShiftManagementStackProps extends cdk.StackProps {
  settings: RuntimeSettings;
}

export class ShiftManagementStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ShiftManagementStackProps) {
    super(scope, id, props);

    const { adminCidr } = props.settings;

    // SSHは管理者IPとLightsailコンソールのブラウザSSHだけに許可する。
    // adminCidr未指定ならブラウザSSHのみになる
    const sshPort: lightsail.CfnInstance.PortProperty = {
      protocol: 'tcp',
      fromPort: 22,
      toPort: 22,
      cidrs: adminCidr ? [adminCidr] : [],
      ipv6Cidrs: [],
      cidrListAliases: ['lightsail-connect'],
    };

    const publicPorts: lightsail.CfnInstance.PortProperty[] = [80, 443].map((port) => ({
      protocol: 'tcp',
      fromPort: port,
      toPort: port,
      cidrs: ['0.0.0.0/0'],
      ipv6Cidrs: ['::/0'],
    }));

    // 初期設定はUserDataに書かない。UserDataを変えるとインスタンスが作り直されるため、
    // infra/server/setup.shをSSHで実行する
    const instance = new lightsail.CfnInstance(this, 'Server', {
      instanceName: config.instance.name,
      availabilityZone: config.availabilityZone,
      blueprintId: config.instance.blueprintId,
      bundleId: config.instance.bundleId,
      keyPairName: config.instance.keyPairName,
      networking: {
        ports: [sshPort, ...publicPorts],
      },
    });

    // DBが同居しているため、スタック削除や置き換えでインスタンスを消さない
    instance.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    const staticIp = new lightsail.CfnStaticIp(this, 'StaticIp', {
      staticIpName: config.staticIpName,
      attachedTo: instance.instanceName,
    });
    staticIp.addResourceDependency(instance);
    staticIp.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    // DBバックアップの外部保存先。アクセスキーはCloudFormationで作れないためCLIで発行する
    const backupBucketName = `${config.backupBucket.namePrefix}-${cdk.Aws.ACCOUNT_ID}`;
    const backupBucket = new lightsail.CfnBucket(this, 'BackupBucket', {
      bucketName: backupBucketName,
      bundleId: config.backupBucket.bundleId,
      objectVersioning: false,
      accessRules: {
        objectAccess: 'private',
        allowPublicOverrides: false,
      },
    });
    backupBucket.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN);

    new cdk.CfnOutput(this, 'InstanceName', {
      value: instance.instanceName,
    });
    new cdk.CfnOutput(this, 'StaticIpAddress', {
      value: staticIp.attrIpAddress,
      description: 'DNSのAレコードに設定するIPアドレス',
    });
    new cdk.CfnOutput(this, 'BackupBucketName', {
      value: backupBucket.bucketName,
    });
  }
}

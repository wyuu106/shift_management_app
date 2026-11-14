// インフラの設定値。変更するときはdocs/infrastructure/architecture.mdも合わせて更新する。

export const config = {
  stackName: 'ShiftManagementStack',
  region: 'ap-southeast-2',
  availabilityZone: 'ap-southeast-2a',

  instance: {
    name: 'shift-management-server',
    // 変更するとインスタンスが作り直され、中のDBが消える。変更前に必ずバックアップを取る
    blueprintId: 'ubuntu_24_04',
    bundleId: 'small_3_2',
    // SSHキーペア名。undefinedならリージョンのデフォルトキーペアを使う。
    // 変更するとインスタンスが作り直されるため、コマンド引数ではなくここで固定する
    keyPairName: undefined as string | undefined,
  },

  staticIpName: 'shift-management-ip',

  backupBucket: {
    // Lightsailバケット名は他のユーザーと重複できないため、アカウントIDを付けて作る
    namePrefix: 'shift-management-backup',
    bundleId: 'small_1_0',
  },
};

// 環境ごとに変わる値は、コマンド実行時に指定する
//   npx cdk synth -c adminCidr=203.0.113.10/32
// ここにはインスタンスの置き換えを起こさない値だけを置く
export interface RuntimeSettings {
  adminCidr?: string;
}

const IPV4_CIDR = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

export function readRuntimeSettings(
  getContext: (key: string) => unknown,
): RuntimeSettings {
  const adminCidr = optionalString(getContext('adminCidr') ?? process.env.ADMIN_CIDR);

  if (adminCidr && !IPV4_CIDR.test(adminCidr)) {
    throw new Error(`adminCidrはIPv4のCIDR形式で指定する（例: 203.0.113.10/32）: ${adminCidr}`);
  }

  return { adminCidr };
}

function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  return value.trim();
}

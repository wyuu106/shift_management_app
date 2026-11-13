// CloudFormationの変更セット（aws cloudformation describe-change-setの出力）を調べ、
// リソースの置き換えや削除が含まれていればデプロイを止める。
// 使い方: node --import tsx scripts/check-change-set.ts <変更セットのJSONファイル>
//   終了コード 0: 実行してよい / 1: 危険な変更あり・判定不能 / 3: 変更なし
import { readFileSync } from 'node:fs';

interface ResourceChange {
  Action?: string;
  LogicalResourceId?: string;
  ResourceType?: string;
  Replacement?: string;
}

export interface ChangeSet {
  Status?: string;
  StatusReason?: string;
  Changes?: Array<{ Type?: string; ResourceChange?: ResourceChange }>;
}

export type Verdict =
  | { kind: 'safe'; changes: string[] }
  | { kind: 'blocked'; reasons: string[] }
  | { kind: 'no-changes' };

const NO_CHANGES_PATTERN = /didn't contain changes|No updates are to be performed/;

export function evaluateChangeSet(changeSet: ChangeSet): Verdict {
  if (changeSet.Status === 'FAILED') {
    if (NO_CHANGES_PATTERN.test(changeSet.StatusReason ?? '')) {
      return { kind: 'no-changes' };
    }
    return { kind: 'blocked', reasons: [`変更セットの作成に失敗: ${changeSet.StatusReason}`] };
  }

  if (changeSet.Status !== 'CREATE_COMPLETE') {
    return { kind: 'blocked', reasons: [`変更セットの状態が想定外: ${changeSet.Status}`] };
  }

  const changes: string[] = [];
  const reasons: string[] = [];

  for (const change of changeSet.Changes ?? []) {
    const resource = change.ResourceChange;
    // 中身を確認できない項目は安全と判定できないため止める
    if (!resource) {
      reasons.push(`判定できない変更(Type: ${change.Type ?? '不明'})`);
      continue;
    }

    const label = `${resource.Action} ${resource.LogicalResourceId} (${resource.ResourceType})`;
    changes.push(label);

    // Conditional は「値によっては置き換え」。安全側に倒して止める
    if (resource.Replacement === 'True' || resource.Replacement === 'Conditional') {
      reasons.push(`置き換え(${resource.Replacement}): ${label}`);
    }
    if (resource.Action === 'Remove') {
      reasons.push(`削除: ${label}`);
    }
  }

  if (reasons.length > 0) {
    return { kind: 'blocked', reasons };
  }
  return { kind: 'safe', changes };
}

function main(path: string): number {
  const verdict = evaluateChangeSet(JSON.parse(readFileSync(path, 'utf8')));

  if (verdict.kind === 'no-changes') {
    console.log('変更はない');
    return 3;
  }

  if (verdict.kind === 'blocked') {
    console.error('危険な変更が含まれるためデプロイしない:');
    verdict.reasons.forEach((reason) => console.error(`  - ${reason}`));
    return 1;
  }

  console.log('適用される変更:');
  verdict.changes.forEach((change) => console.log(`  - ${change}`));
  return 0;
}

if (require.main === module) {
  const path = process.argv[2];
  if (!path) {
    console.error('変更セットのJSONファイルを指定してください');
    process.exit(1);
  }
  process.exit(main(path));
}

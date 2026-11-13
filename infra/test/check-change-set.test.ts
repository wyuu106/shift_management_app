import { ChangeSet, evaluateChangeSet } from '../scripts/check-change-set';

function changeSet(...changes: Array<Record<string, string | undefined>>): ChangeSet {
  return {
    Status: 'CREATE_COMPLETE',
    Changes: changes.map((resourceChange) => ({
      Type: 'Resource',
      ResourceChange: {
        LogicalResourceId: 'Server',
        ResourceType: 'AWS::Lightsail::Instance',
        ...resourceChange,
      },
    })),
  };
}

test('置き換えを伴わない変更は実行してよい', () => {
  const verdict = evaluateChangeSet(changeSet({ Action: 'Modify', Replacement: 'False' }));

  expect(verdict.kind).toBe('safe');
});

test('新規作成は実行してよい', () => {
  const verdict = evaluateChangeSet(changeSet({ Action: 'Add' }));

  expect(verdict.kind).toBe('safe');
});

test.each(['True', 'Conditional'])('置き換え(%s)は止める', (replacement) => {
  const verdict = evaluateChangeSet(changeSet({ Action: 'Modify', Replacement: replacement }));

  expect(verdict.kind).toBe('blocked');
});

test('削除は止める', () => {
  const verdict = evaluateChangeSet(changeSet({ Action: 'Remove' }));

  expect(verdict.kind).toBe('blocked');
});

test('安全な変更と危険な変更が混ざっていたら止める', () => {
  const verdict = evaluateChangeSet(changeSet(
    { Action: 'Modify', Replacement: 'False', LogicalResourceId: 'StaticIp' },
    { Action: 'Modify', Replacement: 'True' },
  ));

  expect(verdict.kind).toBe('blocked');
});

test('安全な変更とResourceChangeのない項目が混ざっていたら止める', () => {
  const safe = changeSet({ Action: 'Modify', Replacement: 'False' });
  const verdict = evaluateChangeSet({
    ...safe,
    Changes: [...(safe.Changes ?? []), { Type: 'Unknown' }],
  });

  expect(verdict.kind).toBe('blocked');
});

test('ResourceChangeのない項目だけの変更セットは止める', () => {
  const verdict = evaluateChangeSet({
    Status: 'CREATE_COMPLETE',
    Changes: [{ Type: 'Unknown' }],
  });

  expect(verdict.kind).toBe('blocked');
});

test('CREATE_COMPLETEで変更一覧がない変更セットは止める', () => {
  const verdict = evaluateChangeSet({ Status: 'CREATE_COMPLETE' });

  expect(verdict.kind).toBe('blocked');
});

test('CREATE_COMPLETEで変更一覧が空の変更セットは止める', () => {
  const verdict = evaluateChangeSet({ Status: 'CREATE_COMPLETE', Changes: [] });

  expect(verdict.kind).toBe('blocked');
});

test.each([
  ['操作', { Action: undefined, Replacement: 'False' }],
  ['論理ID', { Action: 'Modify', Replacement: 'False', LogicalResourceId: undefined }],
  ['リソースの種類', { Action: 'Modify', Replacement: 'False', ResourceType: undefined }],
  ['変更操作の置き換え有無', { Action: 'Modify', Replacement: undefined }],
])('%sが欠けた項目は止める', (_name, resourceChange) => {
  const verdict = evaluateChangeSet(changeSet(resourceChange));

  expect(verdict.kind).toBe('blocked');
});

test.each([
  ['操作', { Action: 'Dynamic' }],
  ['操作', { Action: 'Import' }],
  ['置き換え値', { Action: 'Modify', Replacement: 'Maybe' }],
  ['置き換え値', { Action: 'Add', Replacement: 'Unknown' }],
])('未知の%s(%o)は止める', (_name, resourceChange) => {
  const verdict = evaluateChangeSet(changeSet(resourceChange));

  expect(verdict.kind).toBe('blocked');
});

test('安全な変更と判定できない項目が混ざっていたら止める', () => {
  const verdict = evaluateChangeSet(changeSet(
    { Action: 'Modify', Replacement: 'False', LogicalResourceId: 'StaticIp' },
    { Action: 'Modify', Replacement: undefined },
  ));

  expect(verdict.kind).toBe('blocked');
});

test('変更なしで失敗した変更セットは「変更なし」と判定する', () => {
  const verdict = evaluateChangeSet({
    Status: 'FAILED',
    StatusReason: "The submitted information didn't contain changes. Submit different information to create a change set.",
  });

  expect(verdict.kind).toBe('no-changes');
});

test('それ以外の失敗や想定外の状態は止める', () => {
  expect(evaluateChangeSet({ Status: 'FAILED', StatusReason: 'AccessDenied' }).kind).toBe('blocked');
  expect(evaluateChangeSet({ Status: 'CREATE_PENDING' }).kind).toBe('blocked');
});

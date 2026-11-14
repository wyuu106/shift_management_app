#!/usr/bin/env bash
# CDKの変更を、置き換え・削除がないことを確認してから適用する。
#   1. 変更セットを作るだけで実行しない（cdk deploy --method=prepare-change-set）
#   2. 置き換え・削除が含まれていれば変更セットを消して中止する
#   3. 変更内容を表示し、yesと入力したときだけ実行する
# 使い方: bash scripts/safe-deploy.sh <管理者IP>/32
set -euo pipefail

PROFILE=restaurant
REGION=ap-southeast-2
STACK=ShiftManagementStack
CHANGE_SET="safe-deploy-$(date +%Y%m%d%H%M%S)"

admin_cidr="${1:?管理者IPをCIDR形式で指定してください（例: 203.0.113.10/32）}"

cd "$(dirname "$0")/.."

aws_cfn() {
  aws cloudformation "$@" --stack-name "$STACK" --profile "$PROFILE" --region "$REGION"
}

delete_change_set() {
  aws_cfn delete-change-set --change-set-name "$CHANGE_SET" || true
}

work_dir=$(mktemp -d)
trap 'rm -rf "$work_dir"' EXIT

echo "== 変更セットを作成（まだ適用しない）"
npx cdk deploy \
  --profile "$PROFILE" \
  -c adminCidr="$admin_cidr" \
  --method=prepare-change-set \
  --change-set-name "$CHANGE_SET"

if ! aws_cfn describe-change-set --change-set-name "$CHANGE_SET" --output json \
  > "$work_dir/change-set.json"; then
  echo "変更セットを取得できない。cdkの出力に「no changes」があれば変更はない" >&2
  exit 1
fi

echo "== 変更内容を確認"
set +e
node --import tsx scripts/check-change-set.ts "$work_dir/change-set.json"
verdict=$?
set -e

if [[ $verdict -eq 3 ]]; then
  delete_change_set
  exit 0
fi

if [[ $verdict -ne 0 ]]; then
  delete_change_set
  echo "中止した。変更セットは削除済み。lib/config.ts などの変更内容を見直すこと" >&2
  exit 1
fi

read -r -p "この変更を適用するならyesと入力: " answer
if [[ "$answer" != "yes" ]]; then
  delete_change_set
  echo "中止した"
  exit 1
fi

# 新規作成のときはスタックがREVIEW_IN_PROGRESSになっている
stack_status=$(aws_cfn describe-stacks --query "Stacks[0].StackStatus" --output text)

aws_cfn execute-change-set --change-set-name "$CHANGE_SET"

if [[ "$stack_status" == "REVIEW_IN_PROGRESS" ]]; then
  aws_cfn wait stack-create-complete
else
  aws_cfn wait stack-update-complete
fi

echo "== 適用した"
aws_cfn describe-stacks --query "Stacks[0].Outputs" --output table

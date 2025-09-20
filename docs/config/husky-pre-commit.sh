#!/usr/bin/env sh
# Husky pre-commit 参考脚本（文档示例，需自行复制到 .husky/pre-commit 并赋予可执行权限）
# 适用：在提交前运行 lint-staged，阻止不合规代码进入仓库。
# 使用：
#   1) npm i -D husky lint-staged
#   2) npx husky init
#   3) 将本脚本内容复制覆盖 .husky/pre-commit
#   4) 在 package.json 增加：{ "lint-staged": "参见 docs/config/lint-staged.config.json" }
# Windows PowerShell 用户可在 .husky/pre-commit 中调用 `npx lint-staged`

. "$(dirname -- "$0")/_/husky.sh"

echo "[husky] running lint-staged..."
# 优先从本地 package.json 的 lint-staged 字段读取配置；如无可指定 -c 指向 docs/config
if npx lint-staged; then
  echo "[husky] lint-staged passed."
  exit 0
else
  echo "[husky] lint-staged failed. Please fix and commit again."
  exit 1
fi
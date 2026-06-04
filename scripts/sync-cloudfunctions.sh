#!/bin/bash
# 将项目根目录 cloudfunctions 同步到微信小程序编译产物目录
# HBuilderX 运行到微信开发者工具后执行: bash scripts/sync-cloudfunctions.sh

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/cloudfunctions"

node "$ROOT/scripts/sync-cloud-assets.js"

if [ ! -d "$SOURCE" ]; then
  echo "[error] 未找到 cloudfunctions: $SOURCE"
  exit 1
fi

for TARGET in "$ROOT/unpackage/dist/dev/mp-weixin/cloudfunctions" "$ROOT/unpackage/dist/build/mp-weixin/cloudfunctions"; do
  if [ -d "$(dirname "$TARGET")" ]; then
    rm -rf "$TARGET"
    cp -R "$SOURCE" "$TARGET"
    echo "[ok] $TARGET"
  else
    echo "[skip] $(dirname "$TARGET") 不存在，请先运行到微信开发者工具"
  fi
done

echo "完成。请在微信开发者工具刷新后，右键云函数 -> 上传并部署：云端安装依赖"

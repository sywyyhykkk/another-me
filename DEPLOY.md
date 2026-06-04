# 对面的我 — 部署说明

## 换设备 / 首次 clone（必看）

`cloudfunctions/*/shared/` 是由 `scripts/sync-cloud-assets.js` 从 `cloudfunctions/_shared/` **自动生成的部署副本**，已加入 `.gitignore`，不会进仓库。因此新设备 clone 后该目录不存在，**直接上传部署 `virtualProfile` 会报"找不到模块"**。

clone 后任选其一即可生成（前端本地预览不受影响）：

```bash
npm install      # 已配置 postinstall，自动生成
# 或
npm run sync     # 等价于 node scripts/sync-cloud-assets.js
```

> 改云函数共享逻辑时只改 `cloudfunctions/_shared/`，部署前再 `npm run sync` 重新生成副本。

## 环境 ID（唯一配置源）

编辑 `cloudfunctions/env.config.js` 中的 `ENV_ID`，然后执行：

```bash
node scripts/sync-cloud-assets.js
```

会同步到：

- 各云函数 `*/env.config.js`
- 小程序 `config/cloud.ts`
- `virtualProfile/shared`（日程、活动、资产模块）

## 云函数

仅剩两个云函数。活动文案/心情、视频占位等纯计算已下沉为 `virtualProfile` 内的本地模块（`shared/activityCore.js`、`shared/assetCore.js`），不再单独部署，也不再产生跨函数调用。

| 云函数 | 说明 |
|--------|------|
| `virtualProfile` | 档案 CRUD、刷新、节流；进程内完成活动/资产计算 |
| `geoResolver` | 对蹠点、GeoNames、缓存（唯一的外网请求子函数） |

> 旧版本的 `activityEngine`、`assetResolver` 已废弃。若云端仍存在这两个函数，可在微信云开发控制台手动删除。

依赖版本：`wx-server-sdk@2.6.3`（各目录 `package.json` 已锁定）。

### 调用关系

- 创建档案：`virtualProfile` → `geoResolver`（`resolveCombined`，反查起点 + 对蹠点合并为 1 次调用），活动/资产本地计算。
- 打开/刷新档案：geo 对单个档案不变，直接复用已存储结果，活动本地重算 → **稳态 0 次跨函数调用**；仅当缺失或上次为 fallback 时才回查 `geoResolver`。

### 超时配置（必看）

各云函数目录已有 `config.json`（默认云端常为 **3 秒**，会导致 `-504003 FUNCTIONS_TIME_LIMIT_EXCEEDED`）：

| 云函数 | timeout |
|--------|---------|
| `virtualProfile` | 60s |
| `geoResolver` | 30s（GeoNames 外网请求） |

修改 `config.json` 后必须 **重新上传并部署** 对应云函数，仅本地改代码不会更新云端超时。

### 部署步骤

1. 执行 `node scripts/sync-cloud-assets.js`
2. HBuilderX 运行到微信开发者工具后，可选：`bash scripts/sync-cloudfunctions.sh`（把云函数拷进编译产物）
3. 微信开发者工具 → 各云函数目录 → **上传并部署：云端安装依赖**（会带上 `config.json`）

## 云数据库

需存在集合（首次调用可能自动创建部分集合）：

- `virtual_profiles`
- `user_settings`
- `geo_cache`
- `app_config`

### GeoNames

在 `app_config` 集合新增文档 `_id: geonames`：

```json
{ "username": "你的 GeoNames 用户名" }
```

未配置时 `geoResolver` 会返回 `Missing GEONAMES_USERNAME`。

## 日程表修改

只改 `cloudfunctions/_shared/activityScheduleCore.js` 中的 `TIMELINE_TEMPLATES`，然后执行 `node scripts/sync-cloud-assets.js`，再重新部署 `virtualProfile`。

## 提审前检查

- [ ] 云函数已部署且 `env.config.js` 环境正确
- [ ] GeoNames 已配置
- [ ] 真机：定位 / 手动选城 / 创建 / 结果页刷新 / 分享
- [ ] 微信公众平台已开通 `getFuzzyLocation`，隐私政策与模糊位置说明已填写
- [ ] `manifest.json` 中 `urlCheck: true`（已开启）

## 版本号

小程序版本在 `manifest.json` 的 `versionName` / `versionCode` 中维护。

## 前端依赖（uni-icons）

项目使用 `uni_modules/uni-icons`。若图标不显示：

1. HBuilderX：**工具 → 构建 npm**（需已执行过 `npm install`）
2. 或从插件市场重新导入 [uni-icons](https://ext.dcloud.net.cn/plugin?id=28) 到 `uni_modules`

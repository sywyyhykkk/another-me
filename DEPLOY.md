# 对面的我 — 本地开发与发布

小程序通过 HTTP 调用独立的 NestJS 后端。
后端仓库：[another-me-backend](https://github.com/sywyyhykkk/another-me-backend)。
本机小程序目录为 `~/Desktop/another-me`，后端目录为 `~/Desktop/another-me-backend`。

## 本地启动后端

需要 Node.js 24.15 或更新版本。

```bash
cd ~/Desktop/another-me-backend
npm ci
cp .env.example .env
```

填写 `.env` 中的 `WECHAT_APP_SECRET` 和 `GEONAMES_USERNAME`。
AppID 必须与小程序 `manifest.json` 一致；GeoNames 账号需开通免费 Web Services。
`.env` 只保存在本机。

```bash
npm run build
npm start
```

默认地址为 `http://127.0.0.1:3000/api`，健康检查路径为 `/api/health`。
SQLite 数据默认保存在后端的 `data/another-me.sqlite`，重启后保留。

## 小程序调试

1. 在 HBuilderX 打开小程序项目，运行到微信开发者工具。
2. `config/api.ts` 默认指向本机后端。微信开发者工具本地调试时开启“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。
3. 首页首次请求自动完成微信登录，无须额外登录页面；会话过期时自动重新登录。
4. 定位或手动选城后选择形象，即可创建档案；结果、日程和分享页面读取同一档案。
5. 真机本地调试需将 `config/api.ts` 改为电脑在同一局域网的 IP，并开启小程序调试模式。

## 发布时配置

服务器准备好后部署后端，再将 `config/api.ts` 改为实际 HTTPS 地址，
例如 `https://api.example.com/api`，并在微信公众平台配置对应的 request 合法域名。
发布配置保持 `manifest.json` 中的 `urlCheck: true`。

后端环境变量、启动方法及接口详见后端 README。小程序版本在
`manifest.json` 的 `versionName` / `versionCode` 中维护。

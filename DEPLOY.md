# 对面的我 — 本地开发与发布

小程序通过 HTTP 调用独立的 NestJS 后端。
前端只支持微信小程序，使用 uni-app、Vue 3 和 TypeScript。
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

1. 在小程序目录运行 `npm ci`，再在 HBuilderX 打开项目，运行到微信开发者工具。
2. `config/api.ts` 目前指向已部署的 HTTPS 后端；本地开发时可改为本机后端地址。微信开发者工具本地调试时开启“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。
3. 首页首次请求自动完成微信登录，无须额外登录页面；会话过期时自动重新登录。
4. 定位或手动选城后设置名字与性别，再选择形象创建档案；结果和日程页面按同一规则推进活动；分享页面创建固定的公开快照。创建成功后的结果页返回统一回到首页；“换一个形象”先进入名字与性别设置页。
5. 真机本地调试需将 `config/api.ts` 改为电脑在同一局域网的 IP，并开启小程序调试模式。

## 代码格式与检查

自有 Vue、TypeScript、JavaScript、SCSS、配置和测试文件使用项目 Prettier 配置：

```bash
npm run format
npm run format:check
npm test
```

第三方组件、编译产物、素材和本地开发工具配置不参与格式化。微信小程序构建仍由 HBuilderX 完成。

## 发布时配置

已部署后端为 `https://another-me.m4n9o.com/api`；在微信公众平台配置
request 合法域名 `https://another-me.m4n9o.com`。服务器使用 `ssh another-me-server` 登录，
服务为 `another-me.service`，部署目录为 `/opt/another-me`。
发布配置保持 `manifest.json` 中的 `urlCheck: true`。

后端环境变量、启动方法及接口详见后端 README。小程序版本在
`manifest.json` 的 `versionName` / `versionCode` 中维护。

共同产品依据为桌面 `another me 需求文档.md`。分享快照页面无需登录。
发行版本为 0.8.0，使用 HBuilderX 发行，再从微信开发者工具上传构建目录。
0.8.0 已于 2026-10-02 上传至微信开发者工具，CLI 返回 `✔ upload`。
微信 request 合法域名已配置，腾讯云已放行公网 TCP 443。公网 HTTPS 健康检查返回 HTTP 200；
正式构建保持域名校验，并通过正式 HTTPS 地址完成重新登录和已有档案读取。
上传为开发版本提交，审核和正式发布在微信公众平台另行操作。
如灰度基础库导致模拟器启动失败，在本地设置选择非灰度基础库后重新编译。

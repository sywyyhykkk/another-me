# 项目产品依据

本项目以 `/Users/junyu/Desktop/another me 需求文档.md` 为唯一共同产品依据。实现或修改功能前先阅读该文档；用户明确提出新要求时，以用户要求为准，并同步需求文档、前后端接口和类型。

前端目录为 `/Users/junyu/Desktop/another-me`，后端目录为 `/Users/junyu/Desktop/another-me-backend`。后端保持独立 NestJS 架构和微信登录流程。真实对跖点不使用城市代理定位；分享访客只能读取公开快照。禁止引入云函数相关代码、备份或兼容实现。每日规则修改时同步前后端 world.js。

前端只支持微信小程序，使用 Vue 3，不添加 H5、App 或其它小程序平台分支。自有源码使用项目 Prettier 配置；修改后执行 `npm run format`，并用 `npm run format:check` 检查格式。第三方组件与编译产物不参与格式化。

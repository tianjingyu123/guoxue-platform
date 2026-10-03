# 微信小程序同版开发者工具编译验收（2026-09-28）

候选为 `release/launch-staging-20260927` 的运行源码 `fde4cdc1d44efed3849e55e00cc1db7902914a21`；输入目录是该候选构建的 `apps/mobile/dist/build/mp-weixin`，AppID `wx06397e8ab26bed9e`。未上传审核版、未正式发布、未创建真实付款。

## 实测结果

- 官方微信开发者工具命令行 `cli.bat open` 成功识别同版项目。首次 `preview` 编译报 `ENOENT components/common/ai-search-modal.json`。检查最终构建产物确认 `pkg-circle/articles/index` 和 `pkg-search/search/index` 的 JSON/JS 已指向各自分包 `shared-components/common/ai-search-modal`，两个目标的 JS/JSON/WXML/WXSS 均存在；主包旧文件按体积迁移规则被删除。开发者工具首次仍引用旧位置，与其项目缓存状态相符。
- 仅关闭并重开**本隔离构建目录对应的项目窗口**，未清全局缓存、未改源码或构建产物。随后官方 `cli.bat preview` 编译成功并生成预览二维码；证据为本地忽略目录 `artifacts/release-audit-20260927/mp-preview-fde4cdc1d-r1.log`、`mp-preview-fde4cdc1d-r1.json`。二维码仅供受控体验，不入仓库。
- 开发者工具返回实际预览包：总量 12,694,122 B；主包 1,940,501 B，距 2 MiB 上限 156,651 B；最大分包 `pkg-paipan` 1,960,668 B，距上限 136,484 B。此前源码体积脚本给出的主包 1.60 MB、`pkg-paipan` 1.68 MB 是**本地文件口径**，不能替代本次开发者工具实际预览口径。两项均未超 2 MiB，但余量较小，后续源码改动须重新预览。

## 覆盖边界与下一步

本次证明最终构建产物在登录的官方开发者工具里完成了项目编译和预览打包，未证明模拟器中首页、圈子、视频、支付页等页面实际加载，更未证明手机真机交互或线上体验版。官方自动化入口 `wechatide` 连续返回 `MCP_INIT_ERROR`；传统 `cli auto` 已识别 AppID 但自动化端口未建立，停止了等待的 CLI 进程，未重启其他项目窗口。需在可用的模拟器自动化或受控体验账号下，继续逐页实载、截图与支付回返验收。若开发者工具下次仅报已迁移组件旧路径，先对**本项目**关闭重开并核构建文件；不能凭这一条缓存错误修改业务源码或全局清缓存。

本次无小程序正式发布、审核提交、真实扣款或生产环境改动。

# Android 253 同版资源与本地真机验收（2026-09-29）

## 版本和产物

- 接收分支 `release/launch-staging-20260927`，当前 HEAD `156d71efcf59b162cc5352e759cbff12ce7bc3d4`；运行源码冻结于 `fde4cdc1d44efed3849e55e00cc1db7902914a21`，后续两笔只改文档。工作树原先干净，本次未修改运行源码。
- HBuilderX 5.23 官方本地资源导出使用已绑定腾讯云 `rebuguoxue` 空间的唯一项目别名 `launch-mobile-20260927`；编译和导出退出 0。日志：`artifacts/release-audit-20260927/hbuilder-app-resource-bound-fde4cdc1d.log`。
- 官方资源与同版普通 App 资源均为 488 文件，清单一致，仅 `app-service.js` 与 `manifest.json` 有预期差异；版本代码 253、AppID、正式 API/静态资源地址、服务空间标识均通过审计。证据：`artifacts/release-audit-20260927/hbuilder-app-resource-audit-fde4cdc1d.json`。官方主脚本 SHA-256 为 `5126d7bef3d9b17c1575f78157deee286bfdb38e94895be6fd70a8c9808dee79`。
- 资源归档 `artifacts/releases/gx-hbuilder-app-resource-fde4cdc1d.tar.gz`，SHA-256 `d9716fb7cb45f4eb279478a04d5bd6cc1b04b65ffee961df1e0e7b629255113b`；独立解包 488/488 文件逐字节核对通过。

## 本地验收 APK 与手机

- 在隔离目录复制本次官方资源，仅恢复旧 253 本地包骨架所需、官方导出省略的 `plus.distribute` 和 `app-harmony.distribute` 两段清单字段；其余 487 个资源文件未改。沿用旧 253 **本地测试包**的原生骨架制作本次仅供验收的签名 APK。APK 内 488/488 个 WWW 文件与该验收输入逐字节一致。
- APK：`artifacts/release-audit-20260927/signed-fde4cdc1d-local253/rebu-1.1.0-253-preprod.apk`，30,776,609 字节，SHA-256 `cf4ebff57cf0e80b7747dcc13f2f1bb434a7e734161ac56b7e7dab6e22bd7d31`。v1/v2 签名验证均为 true，证书指纹与旧本地包一致。签名口令仅由受限本机文件传入构建进程，未输出或提交。构建日志保存在同目录上层 `android-fde4cdc1d-local253-build.log`。
- 经用户此前授权，在已连接的 OnePlus 9R 上使用覆盖安装，不卸载、不清数据，系统返回 `Success`，版本仍是 `1.1.0 (253)`；启动前台为 `io.dcloud.PandoraEntryActivity`。实际加载首页、排盘入口和圈子“我的圈子”视图。截图：`android-fde4cdc1d-home-loaded.png`、`android-fde4cdc1d-paipan-entry.png`、`android-fde4cdc1d-circle.png`，均在 `artifacts/release-audit-20260927/`。
- 进一步在排盘首页打开原生分享菜单，能看到微信好友、朋友圈、当前页截图、保存截图和公开链接等选项；只取消菜单，未发送或发布。Android 返回键回到热卜首页。截图：同目录 `android-fde4cdc1d-paipan-share.png`、`android-fde4cdc1d-paipan-back.png`。这只证明排盘首页的分享入口与返回，不是某个排盘结果的真实分享接收测试。

## 边界与后续

本地验收 APK 沿用旧原生骨架，**不是正式云打包或商店发布包**。本次证明最新运行源码对应的官方资源可装机并加载上述三个页面；不证明原生一键登录插件、真实排盘报告、支付回调、语音、直播、iOS/鸿蒙或目标两节点已验。当前公开 API 仍回读旧发布标识，不能用此端侧冒烟作为同版服务端闭环证据。生产数据库迁移、云函数部署、正式安装包和受控真实渠道验收仍是发布阻塞；未调用计费取号、未建订单或更改真实权益。

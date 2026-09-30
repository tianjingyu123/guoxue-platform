# Android 原生资源恢复扩展

这是完整包源码，默认配置 `enabled:false`。不提供 iOS/Harmony 更新能力，扩展设定 Android API 33 及以上；Ed25519 provider、目录同步、AndroidKeyStore 和 DCloud 启动时序仍须在目标设备验证。AAR 编译、UTS 转译和 JVM 文件测试均不能替代该验收。

官方接线：[UTS 插件](https://uniapp.dcloud.net.cn/plugin/uts-plugin.html)的 UTSAndroidHookProxy.onCreate 同步调用 ResourceRuntime.boot；App.vue 只在引擎已启动后下载、暂存和排队。下次原生冷启动先恢复未确认版本，再决定是否安装新资源。`plus.runtime.install` 不承担这里的恢复逻辑。

采用 [PRIVATE_WWW](https://www.html5plus.org/doc/zh_cn/io.html)与 manifest `runmode:liberate`，由首次健康 JS 启动提供真实 `_www/` 路径，原生限制到本应用 `/apps/<runtimeAppId>/www`。未绑定、身份/证书不符、缺公钥根、政策禁用或复检失败时都不安装。基座改变拒绝沿用旧日志；完整包升级与 SDK 释放资源的兼容迁移必须单独真机验证，不会自行猜测或删除 SDK 私有状态。

```powershell
node scripts/release/build-resource-native.mjs
node scripts/release/verify-resource-native.mjs
```

第一条以模板生成默认关闭的 AAR，并放入 uni_modules 对应 libs；随后才能编译 App 资源。AAR 为生成产物，不进 Git。可将受控、已核验配置文件作为第一条的路径参数：包含产品/应用/平台/渠道/包名/runtimeAppId/nativeBuild/nativeFingerprint、实际安装证书 SHA-256、公开 clientKey、API HTTPS 固定入口、资源 HTTPS origins 和根公钥。只接受公钥，不放私钥、账号密码或生产 JWT。构建器的格式检查不能充当证据审核。

原生事务：保留一个健康版本，原始签名 WGT 每次启动重新验签、哈希校验和解压；文件状态用 fd.sync 与原子替换，目录用 Android Os.fsync。SWITCHING/PENDING_HEALTH 在下一次 JS 前恢复。恢复无法完成且日志仍非健康时终止进程，保留现场；磁盘/文件系统损坏不保证可恢复运行。

健康备份在切换前计算文件树摘要，恢复前核验，篡改或丢失时不会盲目加载。完整包基线身份写入日志；更换基座拒绝重用旧日志。网络复检最多连接/读取各 3 秒，另有同步文件操作；冷启动耗时、ANR 和真实 SDK 目录行为必须纳入设备验收。

构建器生成 `artifacts/native-resource-update/build.json`，绑定源码 SHA、脏状态、公开配置和 AAR 摘要。渠道正式资源构建要求它来自同一干净提交，并检查启用时的身份/选择器/指纹；`--dry-run` 仅验证目录与身份参数，不声明 AAR 或完整包可用。

每次已更新版本启动都需健康确认；连续未确认会回退。JS 至少前台观察 65 秒且已有页面、没有全局错误，原生也检查至少 60 秒。用户在观察窗口内反复退出也可能触发保守回退，须在实机测试并接受这一策略。不能声称它独立证明所有业务都健康。

支付来源是 requestPayment 生命周期和汇付支付宝真实组件租约；直播/预览来源是 TRTC 实际控制；录音来自 RecorderManager 与 Android 活跃录音检测；上传来自 uploadFile 生命周期。活动状态保存在原生私有目录，未知或遗留忙状态拒绝切换。账户 JWT 仅由本 App 传入，AndroidKeyStore AES-GCM 加密后用于冷启动账号灰度复检，不提取网页登录凭据。

第二条验证真实 Java 的签名、文件、独立进程中止和启动恢复，并验证 Node 根授权签名能被 Java 接受；测试私钥只在内存。尚未执行 DCloud 实际 APK、Android 文件系统/provider/Keystore 或真实支付/直播/录音/上传测试。正式证据需要全部必验项及完整包摘要、真实证书、编译器/运行时匹配记录。

后续完整包输入：候选编译器是 5.23，已安装的 HX523 可执行文件实际为 5.22，旧安装为 5.14，不能按目录名字选 SDK。官方 [Android 历史 SDK](https://nativesupport.dcloud.net.cn/AppDocs/download/historyRelease/androidRelease.html)要求对应资源编译器；本轮未取得并验证匹配离线运行时、AppKey/签名打包输入，未生成可宣称正式兼容的完整 APK。建立完整包基线时还须提升实际原生构建号、核验每渠道证书/包名，不能把现有 253 资源构建当成新原生包发布。

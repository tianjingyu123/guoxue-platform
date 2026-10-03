# Android 原生资源恢复扩展

这是完整包源码，默认配置 `enabled:false`。C 类 WGT 扩展的代码边界已调整为 Android API 26；API 26–32 缺少系统 Ed25519 provider 时使用固定 Bouncy Castle 轻量验签回退，不降级签名算法。不提供 iOS/Harmony WGT。API 34 独立测试包已验证目录同步、BC 验签及 AndroidKeyStore，但没有 API 26–32 实机证据、用户版本分布或 DCloud 完整包启动时序证据。A/B 运营与完整包更新不依赖启用此扩展。

官方接线：[UTS 插件](https://uniapp.dcloud.net.cn/plugin/uts-plugin.html)的 UTSAndroidHookProxy.onCreate 同步调用 ResourceRuntime.boot；App.vue 只在引擎已启动后下载、暂存和排队。下次原生冷启动先恢复未确认版本，再决定是否安装新资源。`plus.runtime.install` 不承担这里的恢复逻辑。

采用 [PRIVATE_WWW](https://www.html5plus.org/doc/zh_cn/io.html)与 manifest `runmode:liberate`，由首次健康 JS 启动提供真实 `_www/` 路径，原生限制到本应用 `/apps/<runtimeAppId>/www`。未绑定、身份/证书不符、缺公钥根、政策禁用或复检失败时都不安装。基座改变时，CompleteBaseMigration 在 JS 前从已验证安装证书/包名/构建的 APK assets 建立新基线，归档旧日志、当前资源及旧回退，不重用旧 WGT 状态，不猜测或删除 SDK 私有数据库。不能识别路径、缺资产或无法完成事务时拒绝继续加载。关闭 WGT 的后续完整包也必须携带匹配身份及基线，不能用空模板忽略已经存在的旧事务。

```powershell
node scripts/release/build-resource-native.mjs
node scripts/release/verify-resource-native.mjs
```

第一条以模板生成默认关闭的 AAR，并放入 uni_modules 对应 libs；随后才能编译 App 资源。AAR 为生成产物，不进 Git。可将受控、已核验配置文件作为第一条的路径参数：包含产品/应用/平台/渠道/包名/runtimeAppId/nativeBuild/nativeFingerprint、实际安装证书 SHA-256、公开 clientKey、API HTTPS 固定入口、资源 HTTPS origins 和根公钥。只接受公钥，不放私钥、账号密码或生产 JWT。构建器的格式检查不能充当证据审核。

原生事务：保留一个健康版本，原始签名 WGT 每次启动重新验签、哈希校验和解压；文件状态用 fd.sync 与原子替换，目录用 Android Os.fsync。SWITCHING/PENDING_HEALTH 在下一次 JS 前恢复。恢复无法完成且日志仍非健康时终止进程，保留现场；磁盘/文件系统损坏不保证可恢复运行。

健康备份在切换前计算文件树摘要，恢复前核验，篡改或丢失时不会盲目加载。完整包基线身份写入日志；更换基座归档旧状态并建立资源版本 0。网络复检最多连接/读取各 3 秒，另有同步文件操作；冷启动耗时、ANR 和真实 SDK 目录行为必须纳入完整包验收。小型探针的耗时不证明正式资源规模下的启动表现。

构建器生成 `artifacts/native-resource-update/build.json`，绑定源码 SHA、脏状态、公开配置和 AAR 摘要。渠道正式资源构建要求它来自同一干净提交，并检查启用时的身份/选择器/指纹；`--dry-run` 仅验证目录与身份参数，不声明 AAR 或完整包可用。

每次已更新版本启动都需健康确认；连续未确认会回退。JS 至少前台观察 65 秒且已有页面、没有全局错误，原生也检查至少 60 秒。用户在观察窗口内反复退出也可能触发保守回退，须在实机测试并接受这一策略。不能声称它独立证明所有业务都健康。

支付来源是 requestPayment 生命周期和汇付支付宝真实组件租约；直播/预览来源是 TRTC 实际控制；录音来自 RecorderManager 与 Android 活跃录音检测；上传来自 uploadFile 生命周期。活动状态保存在原生私有目录，未知或遗留忙状态拒绝切换。账户 JWT 仅由本 App 传入，AndroidKeyStore AES-GCM 加密后用于冷启动账号灰度复检，不提取网页登录凭据。

第二条验证 Java 签名、文件、独立进程中止和恢复：平台 JCA 与强制 BC 各运行同一 10 组核心测试，另有 Node→Java 根签名验证及完整包迁移五个强制退出点/越界拒绝。独立包 `cn.rebu.resourceprobe` 在 API 34 实测 Keystore 加解密、BC、坏 JS、归档篡改、过期/跨渠道/错误基座、四个资源事务杀进程检查点，以及五个完整 APK 升级杀进程检查点；旧资源、加密会话和合成用户数据保留，正式包未变。该宿主是 Application/WebView，OfferCheck、忙碌标记与核心健康确认是合成夹具；不是 DCloud APK 或真实支付/直播/录音/上传验收。证据见第三阶段交接。

依赖固定为 `bcprov-jdk15to18:1.86`，来源及 SHA-256 见 dependencies.json。构建下载/缓存均校验摘要；依赖与打包脚本纳入原生边界。仅启用 C 的 AAR 包含完整原始 jar、对应许可证资产及反射保留规则；普通 B 配置不初始化 provider、不包含该库，也不申请额外权限。LICENSE.bouncycastle.txt 保留 jar 内随附版权/许可文本；官网当前许可年份与随附类的年份不同，不自行改写版权。维护时必须核验官方版本、摘要、许可证并重建完整包，不可经 WGT 更新原生依赖。

后续完整包输入：候选编译器是 5.23，旧记录将 HX523 宿主判为 5.22，旧安装为 5.14；本轮读取到 launcher/base 的 5.23 元数据，CLI 因客户端未启动未能核对运行版本，不能仅凭目录名字或单一版本记录选择 SDK。官方 [Android 历史 SDK](https://nativesupport.dcloud.net.cn/AppDocs/download/historyRelease/androidRelease.html)要求对应资源编译器；本轮未取得并验证匹配离线运行时、AppKey/签名打包输入，未生成可宣称正式兼容的完整 APK。建立完整包基线时还须提升实际原生构建号、核验每渠道证书/包名，不能把现有 253 资源构建当成新原生包发布。

继续验收补充：consumer-rules.pro 统一保留 Native.js 使用固定名称的 ResourceRuntime / Callback 公共入口及 BC 反射类。独立探针构建器支持 --minify，用 R8 release 优化并关闭 debuggable，实际调用固定名称反射入口；详情见第四阶段渠道表单与R8验证交接。压缩探针仍不是 DCloud 发布包。

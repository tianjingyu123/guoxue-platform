# 客户模型预算冻结证据

受测源码 `a1d37c4a2cfd0167a4474798a47a4cb6706e6c69`，接收基线 `910806b8e72b7259b6b8011604d3e23413ae93fd`。29套完整串行验证零失败：23套真实本地数据库/服务190组；另列合成字节流9组、只读核验模拟4组、原商业100项、认证47项、SQLite18组和客户端隔离11条。全部production:false，不当成真实供应商鉴权、余额或收费验收。

manifest-20261003.json绑定128个源码磁盘字节/Git对象、1364个编译文件和29份最终原始报告，新增登记CLI也纳入统一清单。quality-checks.json记录源码冻结后候选编译及相关lint退出0。post-verification-integrity.json核原件，archive-integrity.json核暂存证据原字节；本目录全部文件禁用换行转换，SHA保持原字节。

chat-budget-20261003.json的7组使用真实本机HTTP、Nest与PostgreSQL：不同进程、账号及应用竞争最后未确认和总次数名额，同键完成重放不耗次数，跨客户额度独立，未知结果在两天及进程重启后仍占位。未创建真实客户额度或外部模型调用。

provider-registration-20261003.json的4组使用fetch替身；新增缺失及非法预算在HTTP前拒绝、旧无预算付费记录拒绝、预算必须签名及防篡改。initial-probes-review.json保留未冻结专项摘要，未改变旧head，未用作最终通过证据。此前响应边界、停机、微页面证据原样保留。

client-build-compatibility.json只核五类原始客户端构建2435项源码及3874个输出文件摘要不变，保留原构建提交6bb0b15608114996db5eac1a64945a98290494c4，没有新的渠道或真机验收。final-environment.json核合成A/B原绑定及ACTIVE围栏一致，22个恢复目标FROZEN保留；process-cleanup.json核本任务子进程归零，随机端口由最终原始报告断言关闭。

private-acl.json使用PowerShell 7.6.5和遇错即停规则，2772个运行JSON/凭据均成功读取，根继承保护及3条规则，额外Allow为0。secret-scan.json只记录扫描计数，没有受限值。

累计预算计全部持久历史请求含ABORTED，不自动退款或跨日清零；UNKNOWN持续占位，尚无供应商对账后的释放。签名配置由进程启动时读取，维护登记必须单写并协调所有进程使用同一授权。次数不承诺金额、余额、供应商并发或Linux资源隔离。真实客户、商户、渠道、模型授权、基础设施及生产验收仍未关闭。详见[交接](../../多租户客户模型预算与继续推进-20261003.md)。

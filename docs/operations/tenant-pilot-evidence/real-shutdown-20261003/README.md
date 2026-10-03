# 独立入口停机与业务排空冻结证据

受测源码为 `7f150db57e98cea09b3a14b4e37e44e770723373`，接收基线为 `910806b8e72b7259b6b8011604d3e23413ae93fd`。26套完整串行验证零失败：21套真实本地数据库/服务175组；另列原商业单元100项、认证47项、SQLite18组、隔离11条和供应商模拟3组，不相加为真实交易覆盖。全部production:false。

manifest-20261003.json绑定121个源码磁盘字节及Git对象、1363个编译文件和26份最终原始报告摘要。源码冻结后编译及相关文件lint通过，见quality-checks.json。post-verification-integrity.json核原件，archive-integrity.json核暂存证据原字节。本目录全部文件禁用换行转换，说明和属性文件也保持原字节；仅内容比较归一CRLF，不改写SHA。

shutdown-20261003.json的16组使用真实PG行锁、独立Nest实例和编译lease-main：开始退出后拒新请求；已进入事务的订单完成后释放连接；重启同键不重建订单。客户端取消第二笔在途请求后，HTTP关闭时计数仍为1、数据库保持连接；释放锁后订单和库存只提交一次，计数归零再断开。异常400路径没有泄漏计数，另一客户保持可访问。shutdownObservations保存三个实例的实际生命周期事件和活动计数。没有真实收费或外部模型调用。

baseline-http-manifest.json及baseline-http-shutdown.json保留第一阶段源码0f160a3cc2241331fa5f7062014a423db5dbbf50的原始26套清单和11组停机报告。它只覆盖有连接请求的HTTP关闭顺序，未覆盖断线业务，不能替代最终16组证据。initial-probes-review.json记录两个被经营准入拒绝的夹具和未冻结探针，明确不作为最终通过结果。

client-build-compatibility.json复核此前五类构建源码与输出原字节不变，保留真实构建提交6bb0b15608114996db5eac1a64945a98290494c4；本批没有重跑UI或伪造新的客户端构建提交。五类原始构建和UI证据仍在[前批目录](../real-layout-20261003/README.md)。编译资源不等于真机、签名、正式渠道或商户验证。

final-environment.json只读核合成A/B原绑定及ACTIVE围栏一致，18个恢复目标FROZEN并保留。process-cleanup.json核本任务独立子进程归零，随机端口回收由各最终报告断言。private-acl.json核受限根目录继承保护及1489个运行JSON/凭据，额外Allow为0；secret-scan.json只含候选及暂存文件的扫描计数，不含被扫描值。

Windows包装器只主动触发Node事件并观察实际关闭链路，正式入口没有其IPC或HTTP停机路由。没有Linux/systemd真实信号、45秒窗口、cgroup/账户/网络或生产隔离验收。真实客户、商户与渠道、客户模型权限/额度、Redis/BullMQ/COS/pgvector、备份副本/容量/RPO/RTO和北京新两节点仍未关闭；详细边界见[交接](../../多租户独立入口停机顺序与继续推进-20261003.md)。未合主线、推远端、云部署、迁移生产、切DNS、真实收费、付费调用或正式登记。

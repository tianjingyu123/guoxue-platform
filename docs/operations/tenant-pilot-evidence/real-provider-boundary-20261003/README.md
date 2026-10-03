# 客户模型响应边界冻结证据

受测源码 `1abb07d75b4598d9f2b89270ff3a0a5a03f0a71a`，接收基线 `910806b8e72b7259b6b8011604d3e23413ae93fd`。28套完整串行验证零失败：22套真实本地数据库/服务183组；另列合成字节流9组、供应商只读核验模拟3组、原商业100项、认证47项、SQLite18组和客户端隔离11条，不累加为真实交易或供应商授权覆盖。全部production:false。

manifest-20261003.json绑定126个源码磁盘字节/Git对象、1364个编译文件和28份最终原始报告。固定Qwen适配器、协议类型及边界读取器已纳入统一源码清单。quality-checks.json记录冻结后候选编译与相关lint退出0；post-verification-integrity.json核原件，archive-integrity.json核暂存证据原字节。本目录全部文件禁用换行转换；仅内容比较归一CRLF，不改写SHA。

provider-response-20261003.json的9组为合成Web字节流及fetch替身，保留各读取字节、取消及传输信号观察值：64KiB精确边界、跨块中文、声明超限零读取、实际超限、错误正文零读取且无正文日志、无效JSON/编码、正文停滞超时、取消回调不完成、调用方取消、清单1MiB约束及摘要/签名、原平台非固定通道行为。

provider-boundary-20261003.json的8组使用真实loopback HTTP、固定Qwen适配器、三个Nest进程和合成PG。普通及gzip完整答案可提交；压缩超限、503错误、截断JSON和无效编码保留一条UNKNOWN、无助手正文。跨进程同键只查询，换键仍拒绝派发；另一客户查询正常，跨客户令牌拒绝。供应商mock仅在pilots包装器，正式入口仍要求固定客户签名核验与调用授权。

response-baseline.json保留491e6e2755c7d90858e749157062ae43c045b37b源码读取1,048,670字节成功/错误响应的复现及当时磁盘摘要；旧Git内容另核实。原磁盘文件已被修复替换，恢复副本内容与Git一致，但字节SHA不同，不能冒称复现当时的原磁盘字节。它证明缺口，不是最终通过证据。initial-probes-review.json保存三次未冻结探针的摘要和范围，没有改写原始head。此前停机及微页面证据保留原样。

client-build-compatibility.json核此前五类构建的源码与产物字节不变，保留真实构建提交6bb0b15608114996db5eac1a64945a98290494c4；原始构建与UI在[微页面目录](../real-layout-20261003/README.md)。没有重跑UI、签名、装机或真实渠道验收。

final-environment.json核合成A/B原绑定与ACTIVE围栏一致，20个恢复目标FROZEN保留。process-cleanup.json核本任务独立进程归零，随机端口由最终原始报告断言关闭。private-acl.json使用PowerShell 7.6.5和遇错即停规则核根继承保护及2104个运行JSON/凭据，全部路径读取且额外Allow为0。tooling-review.json说明旧PS5.1扫描对长路径返回非终止错误而仍退出0，该次不能算通过；没有修改全局系统设置。secret-scan.json只记录扫描计数，不含受限值。

64KiB是保存响应正文的候选技术预算，不能代表总进程或网络缓冲硬内存限制、合同费用额度或Linux隔离。真实客户、商户、渠道、模型鉴权/生成权限/额度、Redis/BullMQ/COS/pgvector、Linux和网络资源、备份副本/容量/RPO/RTO及北京两节点生产验收仍未关闭。完整边界见[交接](../../多租户客户模型响应边界与继续推进-20261003.md)。本批无真实网络模型请求、付费调用或生产写入。

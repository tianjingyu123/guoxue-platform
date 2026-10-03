# 微页面与品牌资源冻结证据

受测及五类资源构建源码 `6bb0b15608114996db5eac1a64945a98290494c4`，接收基线 `910806b8e72b7259b6b8011604d3e23413ae93fd`。本目录只保存合成测试报告、公开摘要及页面截图，不包含连接URL、密码、密钥、访问令牌、导出下载令牌或客户数据快照。

manifest-20261003.json保存119个磁盘源码及Git对象摘要、1363个服务端及共享包编译文件摘要，以及25份原始报告摘要。JSON禁用换行转换；磁盘字节与Git对象摘要分别保留，只有内容一致性核对归一CRLF。post-verification-integrity.json及archive-integrity.json分别核当前原件与已暂存报告字节。

| 验证类别 | 结果及范围 |
| --- | --- |
| 真实本地数据库/服务 | 20套159组，全部通过；新增微页面发布/回退/版本/撤权/跨应用6组 |
| 原平台商业单元 | 100项通过，无真实收费 |
| 认证 | 47项通过 |
| SQLite | 18组通过 |
| 候选隔离 | 11条通过 |
| 供应商登记 | 合成HTTP及签名3组通过，非真实调用授权 |
| 独立H5界面 | 7项通过；免费学习、公告/文字/宫格、固定订单及390像素布局 |

五份*-receipt.json保留真实干净构建提交、逐源及输出摘要。build-integrity.json核五类候选资源：独立H5/微信/App、品牌H5/微信。品牌H5实际页面与路由均存在，1182个文件；微信游客AppID及品牌页面JS/WXML/JSON存在，2656个文件。没有签名、装机、商店上传、正式登记或运行品牌外壳SDK。preview-h5-receipt.json与ui-verification.json来自相同冻结提交的本地独立入口；五张JPEG截图保存原字节。

brand-h5-incomplete-receipt.json是较早提交的23文件空壳构建，退出0不能证明完整入口。incomplete-build-review.json将其标记FAILED_INCOMPLETE并记录修复后的页面校验。该原始记录没有改写head，不属于通过证据；此前“编译全部通过”的口头状态已据此纠正。

final-environment.json只读核合成A/B原绑定ACTIVE及14个恢复目标FROZEN；数据均保留。process-cleanup.json核本任务预览和lease子进程、预览端口退出。private-acl.json核766个运行JSON/凭据，零额外Allow。secret-scan.json仅含计数，不包含被扫描的受限值。

全部production:false。真实客户/商户/渠道、模型额度、Redis/BullMQ/COS/pgvector、Linux及网络隔离、容量/备份副本/RPO/RTO和新北京两节点验收仍未关闭。完整边界与原计划门槛见 [本批交接](../../多租户微页面消费与品牌小程序补齐-20261003.md)。此前经营批次及截图保留原样，不能将当前布局回写为旧批次已交付。

plan-reference.json记录D盘原工作计划的只读来源和摘要；没有复制或修改另一窗口的原计划文件。

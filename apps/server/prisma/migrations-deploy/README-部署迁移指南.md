# 数据库迁移执行指南

> 给运维/CICD。目标：在已经锁定并通过发布门禁的代码版本上，安全初始化或迁移数据库。
> 完整服务器、数据库、域名切换流程以
> `docs/operations/服务器数据库域名迁移手册-20260728.md` 为准。

## 一、先锁定部署版本

```bash
# 1. 在构建机记录并核对固定提交，不允许生产机直接拉取不确定分支
git rev-parse HEAD

# 2. 安装锁文件指定的依赖
pnpm install --frozen-lockfile

# 3. 代码与空库基线门禁
pnpm release:gate:code
pnpm release:audit-db-baseline

# 4. 记录本次部署提交 SHA、构建产物校验值和回滚版本
```

生产环境只接收上述固定版本的构建产物。数据库迁移完成并通过核对前，不得启动新版 API，
不得用 `git pull master`、`latest` 标签或服务器现场修改代替可追溯发布。

## 二、数据库迁移（二选一）

### 情况 A：全新空库
```bash
cd apps/server
CONFIRM_EMPTY_DATABASE=YES sh prisma/migrations-deploy/bootstrap-empty-database.sh
```
脚本会先确认目标库没有任何业务表，再创建当前 414 个 Prisma 模型对应的完整结构，
并在单个事务中登记 144 条已被基线覆盖的历史迁移。任意非空库都会直接拒绝，不能用此脚本覆盖旧库。

当前基线由 `schema.prisma` 生成：414 张业务表、1032 条显式索引、296 个外键；
连同 `_prisma_migrations` 账本共 415 张表。更新 schema 后必须重新生成并在隔离空库验收基线。
仓库发布门禁会自动执行 `pnpm release:audit-db-baseline`，确保完整基线与当前 Prisma 模型一致。

完整初始化还应用pgvector等运维对象、会员基础套餐DML、渠道/打赏/订单通知及多租户外部CHECK。Prisma schema diff不能单独证明这些对象：Linux隔离空库已实测144原始校验值、3CHECK与非空拒绝，记录见《多租户与同城组合接收验收-20261003》。本机Windows缺vector的失败不能当完整初始化成功；已有正式库仍需最新备份副本增量验收，严禁运行空库脚本。

### 情况 B：已有旧库（当前正式目标属于此类）

不得运行空库初始化脚本，也不得将 `prisma db push` 或临时生成的 diff SQL 直接作为上线迁移。
先只读核实当前正式账本、每份 SQL 校验值和实际表/列/约束，再用固定版本中经过评审的增量迁移，
在最新正式数据备份副本演练。候选总数144、最后观测正式103的41份差额仅为名义计数，不能代替逐份核对。
历史 SQL 不改写，未登记对象不能凭“列已经存在”就补记迁移成功。

`migrate diff` 仅作结构对照，不执行它建议的删除。完整初始化的实际差异包含两个向量字段和12个
GIN/模糊检索索引，均由固定运维 SQL 管理；另外还有表达式/HNSW索引、三个多租户CHECK、
渠道和通知约束等无法仅凭 Prisma 模型覆盖的对象。须逐项检查定义、有效性及作用域，并拒绝其他结构漂移。
不得为使 diff 退出0而删除这些对象或 `_quality_snapshot` 等已登记的外部对象。

副本验收还须覆盖原用户/订单/权益/审计数据保留、迁移事务失败、重试、锁时长和回退兼容。
生产执行仅由当前单写窗口在正式维护时窗内使用同一个固定包、受限配置、实际备份与发布门禁流程；
本轮未执行生产迁移。版本与完整初始化证据见《多租户与同城组合接收验收-20261003》。

## 三、历史关键表样例（不是本版待迁移清单）

以下是早期功能样例；当前是否缺失须按144份候选与实际正式账本另行核查，不能按本表推断：
讲师认证 TeacherCertification、钱包 UserWallet/UserBalanceTransaction、圈子退款 CircleRefundRequest、
佣金追回 CommissionRecall、达人通话 ConsultCall、成长 CircleCheckin/MemberGrowth/BadgeRecord/JoinRequest、
埋点 TrackEvent、资金审批 FundApproval、积分 PointsProduct/PointsExchangeRecord、
直播 LiveReview/LiveTeamMember、IM 策略 ImPolicyConfig/ImC2CCounter、视频提现 VideoCreatorWithdrawal、
古籍/电子书收藏 ClassicBookList/ClassicFavorite/EbookFavorite。
+ 字段：Order.quantity、Order.addressId/shippingInfo/groupId、MerchantSettlement 金额 Decimal、
Content/Circle 等的 deletedAt 软删列（review 增量时确认这些 ADD COLUMN 都在）。

## 四、.env（生产密钥）

- **生产服务器的 `.env` 保留、不要覆盖**（密钥不在仓库里）。
- 新增变量对照 `apps/server/.env.example`。
- 🔴 **地基密钥 `ENCRYPTION_KEY` 必须已备份**（丢失=手机号/后台密钥等加密数据永久解不开）。
- 第三方密钥（支付/AI/腾讯云等）现在可**在管理后台配**（系统→第三方配置），不用填 .env。

## 五、功能开关（首次上线）

9 个守卫端点的 FeatureFlag 默认 404，需开：
```bash
cd apps/server && npx tsx scripts/enable-publish-features.ts   # content_publish/course_publish
# 其余按需在后台 FeatureFlag 表 upsert enabled=true：
#   shop_checkout / live_start / member_purchase / commission_withdrawal / merchant_onboarding
```

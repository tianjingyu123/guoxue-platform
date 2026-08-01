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
脚本会先确认目标库没有任何业务表，再创建当前 343 个 Prisma 模型对应的完整结构，
并在单个事务中登记 82 条已被基线覆盖的历史迁移。任意非空库都会直接拒绝，不能用此脚本覆盖旧库。

当前基线由 `schema.prisma` 生成：343 张业务表、848 条显式索引、254 个外键；
连同 `_prisma_migrations` 账本共 344 张表。更新 schema 后必须重新生成并在隔离空库验收基线。
仓库发布门禁会自动执行 `pnpm release:audit-db-baseline`，确保完整基线与当前 Prisma 模型一致。

### 情况 B：已有旧库（★ 当前生产就是这种，推荐）
只建缺的表、加缺的列，**不动已有数据**：
```bash
cd apps/server
# 1) 在能连生产库的环境，生成"生产库 → 目标 schema"的精确增量
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > deploy-incremental.sql

# 2) ★必须人工 review deploy-incremental.sql：
#    - 应该只有 CREATE TABLE / ADD COLUMN / CREATE INDEX
#    - 如果出现 DROP TABLE "_quality_snapshot" → 删掉这一行再执行
#      （它是监控脚本建的游离表，不在 schema，但不能删）
#    - 如果出现任何 DROP TABLE / DROP COLUMN 有数据的表 → 停下来核对，别盲跑

# 3) 确认无误后执行
npx prisma db execute --file deploy-incremental.sql --schema prisma/schema.prisma

# 4) 验证一致性（期望：0 处不一致）
npx tsx scripts/schema-db-check.ts
```

> 为什么不用 `prisma db push`：会把 schema 里没有、库里有的游离表(如 `_quality_snapshot`)判为多余要 DROP。用 `migrate diff` + 人工 review 最安全。

## 三、本次上线新增的关键表（增量应包含）

工作区固化后新增 ~21 个 model，生产旧库大概率缺：
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

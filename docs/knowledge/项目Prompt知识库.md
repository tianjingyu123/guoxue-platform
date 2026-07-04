# 热卜国学平台 · AI 开发 Prompt 知识库

> 2026-07-05 · Fable 5 沉淀 · 用途：让任何 AI（Claude Code / DeepSeek / 其他）接手本项目时立刻具备"老手"水准。
> 用法：按任务类型复制对应模板，填入【】占位符，整段发给 AI。模板已内嵌本项目全部已知的坑与纪律。

---

## 〇、万能项目上下文头（所有任务都先贴这段）

```
项目：热卜国学平台（传统文化综合平台·570万存量用户·B端化商业模式）
代码：C:\Users\Administrator\Desktop\guoxue-platform（monorepo·pnpm）
 - apps/server  后端 NestJS 10 + Prisma + PostgreSQL(5433) + Redis·270+模型·~50业务模块
 - apps/mobile  移动端 uni-app(Vue3)·H5/小程序/App 多端·38分包·数据层在 src/lib/*-data.ts
 - apps/admin   管理端 Vue3 + Element Plus·~200 views
生产：rebu-server（82.157.110.172·/opt/guoxue·PM2 guoxue-server·端口3001·SSH免密）
 - API https://api.rebugx.cn · H5 https://api.rebugx.cn/h5/（同域无CORS）
唯一真源进度文档：docs/progress/总账-完成度与统一工作方案-20260703.md（开工先读·做完销号附commit）
纪律：只做总账最上面一项；新想法写入backlog不当场执行；跨窗口"已完成/已拍板"必回文档或commit核实。
验证门槛：后端 npx tsc --noEmit + npx jest --no-coverage 全绿；前端 vue-tsc 0 错误 + bash apps/mobile/scripts/scan-mock-imports.sh 返回0。
```

---

## 一、后端任务模板

### 1.1 新增/修改后端端点

```
【万能头】
任务：在 modules/【模块】 中【新增/修改】端点【方法 路径】，功能：【描述】。
要求：
1. 先 Read 该模块的 controller/service/dto 现状再动手，遵循现有代码风格（Swagger 装饰器 @ApiTags 中文、summary 中文）。
2. 鉴权：写操作必须 @UseGuards(JwtAuthGuard) 起步；管理端点加 RolesGuard + @Roles("SUPER_ADMIN","OPERATION_ADMIN")；资金/敏感操作加 @Auditable({action:"中文动作", targetType:"XX"})。
3. DTO 用 class-validator 校验；金额字段 @IsPositive + 上限校验。
4. 涉及资金（coin/wallet/order/commission）：扣减与后续 DB 写必须同一事务；状态翻转用 CAS（updateMany where status=旧值）；幂等用 redis.setNX + DB 唯一约束双保险。
5. 改了 service 构造器签名 → 必须同步对应 .spec.ts 的 providers（否则 DI 解析失败）。
6. 写/补单测；tsc + jest 全绿后报告，不许只报"改完了"。
坑：ValidationPipe transform 会把缺省 ?page 转 NaN，service 层要防御归一化；拦截器会包 {code,data,message} 格式，@SkipFormat() 跳过。
```

### 1.2 新增数据库表/字段

```
【万能头】
任务：给 schema.prisma 加【表/字段】。
铁律：
1. 本地：改 schema → npx prisma generate（必须 cd apps/server 用本地版本，从根目录 npx 会拉 prisma7 报 datasource 错）。
2. 生产：用 prisma migrate diff 生成只增不删的 SQL → prisma db execute --file 执行。【绝对禁止 db push --accept-data-loss，曾差点删数据】。
3. 新增列优先可空或带默认值（避免锁表+老代码兼容）。
4. 金额一律 Decimal 不用 Float/Int 分。手机号等敏感字段看 common/crypto.util 的 buildPhoneFields 加密模式（phoneHash HMAC 查询 + phoneEnc 密文存储）。
```

### 1.3 定时任务（cron）

```
【万能头】
任务：在【模块】加定时任务【描述】。
要求：
1. @Cron 方法体必须包 this.redis.runExclusive("全局唯一锁名", ttl秒, async () => {...})——多实例防重复（cluster 已就绪）。
2. ttl 略大于最坏执行时长：AI/embedding/大批量 1800，普通清理统计 600。
3. 资金写操作（结算/退款/发放）第四参传 { critical: true }（Redis 不可用时拒跑防重复入账）。
4. 避开整点扎堆（低级错峰：选 7/13/23/37/43 等分钟位）。
5. spec 里 RedisService mock 需含 runExclusive: jest.fn((_n,_t,fn)=>fn())（直通执行）。
```

### 1.4 支付/资金链路（最高危区）

```
【万能头】
任务：【支付/资金相关改动描述】。
本项目资金安全契约（违反=事故）：
1. 四条支付回调（微信/支付宝/银联/汇付）+ 币充值：验签 → 防重放时间窗 → setNX 防重入 → 订单 CAS 翻转 → 【入账前金额比对：回调金额 vs order.amount，差≥0.01 拒入账并 logger.error("【资金对账·金额不符】...")】。
2. 回调返回语义：确凿处理完才回 SUCCESS；锁竞争回 FAIL 让渠道重试；金额不符/订单已取消回 SUCCESS 停止重试+落错误台账人工处理。
3. 提现/退款：审批流走 FundApproval（禁自审自批：requestedBy===reviewerId 必须 403）；冲正用 reverseCommission（幂等）。
4. 改完必须跑 shop/coin/huifu/settlement 相关全部 spec。
```

---

## 二、前端任务模板（uni-app 移动端）

### 2.1 页面真连/新页面

```
【万能头】
任务：【页面路径 pkg-xx/xxx】【真连后端/新建页面】。
本项目前端铁律（CLAUDE.md 强制）：
1. 页面禁止直接 import mock 数据——一切数据经 src/lib/【模块】-data.ts 的 xxxApi 异步获取。
2. 对接前先 Read 后端 controller/service 源码确认真实路径与响应结构（别臆造，别信单复数想当然；拦截器包了 {code,data}，分页用 apiGetPaged 取 .items）。
3. 三态必须齐：loading 骨架 / error+重试 / empty+引导。错误不回退假 mock。
4. 写操作必须 submitting 防重复提交。
5. 后端没有的字段 v-if 诚实降级隐藏，不造假数据。
6. 技术栈是 uni-app 非标准 Vue Web：路由 pages.json+navigateTo/onLoad、请求 utils/request.ts 的 apiGet/apiPost、样式 rpx+scss、分包 src/pkg-x/。
7. 完成后：vue-tsc 0 错误 + bash apps/mobile/scripts/scan-mock-imports.sh 返回 0。
坑：手机号输入框 type=number 有精度 bug 用 type=text；分包页面 URL 是 /pkg-xx/xxx/index 别少层级；dev:h5 输出重定向到文件会阻塞事件循环（重定向到 NUL 或用 pm2）。
```

### 2.2 管理端（apps/admin）

```
【万能头】
任务：admin 端【描述】。
注意：admin 是 Vue3+Element Plus（非 uni-app）；api 层已批量 Record<string,unknown> 类型收敛；DataTable 有通用组件；改完 vue-tsc 0 错误。
菜单在 modules/menu/menu.config.ts（后端下发）。
```

---

## 三、多 Agent 并行派单模板

```
（给每个 agent 的 prompt 必含五要素）
1. 精确文件清单："只允许修改以下文件及其同名 .spec.ts：【列表】"+ 显式禁改清单（正在被主线/他 agent 编辑的热点文件必须列入禁改）。
2. 可复制的代码模式/模板（给出改造前后的示例）。
3. 验证命令：npx tsc --noEmit + npx jest --no-coverage 【范围】，"任一失败必须修到绿"。
4. "先 Read 再 Edit"指令 + "改构造器必同步 spec"。
5. 回复格式约定（逐文件清单+验证结果，不贴代码全文）。
并行上限：机械化改造 4 个；业务开发 2 个；公共代码/schema 变更禁止并行。
派单前先 grep 确认文件真实归属（曾踩 order/shop 归属坑）。
主线收口职责：agent 报告的"清单外连锁问题"（如公共 guard 改签名波及其他 spec）由主线统一修，别让 agent 越界。
```

---

## 四、部署模板（生产 rebu-server）

```
任务：部署 commit 【hash】 到生产。
标准流程（每步都有前人踩过的坑）：
1. 本地：git bundle create $env:TEMP\deploy-X.bundle master → scp 到 rebu-server:/tmp/（GitHub 国内不通，bundle 是唯一通道）。
2. 服务器核对：git log -1 确认当前版本是本地祖先（多窗口曾互毁）→ git fetch bundle → git merge --ff-only。
3. 有依赖变更才 pnpm install --frozen-lockfile；有 schema 变更才 prisma（cd apps/server 本地版本 + migrate diff 只增不删）。
4. 构建【最大坑】：cd apps/server && NODE_OPTIONS=--max-old-space-size=6144 nohup npx nest build > /tmp/build.log 2>&1 —— 不加内存参数会 OOM 且删掉旧 dist 留下"重启即死"地雷。
5. pm2 restart guoxue-server --update-env → sleep 6 → curl -s localhost:3001/api/v1/health 确认 checks 全 ok。
6. H5 前端：pnpm --filter @guoxue/mobile build:h5 → tar → scp → 服务器备份旧 dist 后替换 /opt/guoxue/apps/mobile/h5/dist/ → curl https://api.rebugx.cn/h5/ 验 200。
7. 冒烟登录法：ssh rebu-server 'redis-cli set "sms:code:LOGIN:13912340099" 888666 EX 300' 后调 POST /api/v1/auth/login/sms（测试号 13912340099）。多层引号转义用 Bash 工具别用 PowerShell。
8. 回写总账销号。
```

---

## 五、排查/修 Bug 模板

```
【万能头】
现象：【描述】。
排查纪律：
1. 修前必回源：报告/清单里的问题先到代码双核对是否真实存在（曾有清单 14 项里 7 项是虚构的）。
2. 先确认数据源干净再下结论（曾因脏数据+测错方法两次误判结算链路）。
3. 找到根因后 grep 全库搜同类（修复模式：一处根因→搜同类→统一修→统一验证），别修一漏十。
4. 高频既往根因速查：
   - 配置存空 → SanitizePipe 转义了 JSON
   - 接口 500 且入参缺省 → ValidationPipe transform 把 undefined 转 NaN
   - 后端改了不生效 → dev 进程没真重启（杀进程树后从仓库根 pnpm --filter @guoxue/server dev）
   - 工具启动的后端连不上 5433 → 沙箱限制，让用户自己终端起
   - AI 回复驴唇不对马嘴 → AI 网关缓存跨主题误命中 / Coze 没把 query 放进 additional_messages
   - 分佣不产生 → CommissionConfig 空表则引擎空转（"未配置不计算"）
   - PowerShell 改中文文件乱码 → PS5.1 按 ANSI 读无 BOM 文件，用 Edit 工具别用 -replace 管道
```

---

## 六、业务规则速查（改功能前必读的"宪法"）

- **合规红线**：R1 分佣最多两级（多级=传销）；R2 禁大数据杀熟；R3 命理数据只可聚合分析禁个体画像输出；R4 小程序端占卜类目条件编译隐藏。
- **拍板过的业务规则**（改动需董事长同意）：圈子入圈只能现金；创作者内容带货奖励=积分非现金（floor(元)×2 封顶 200/单）；分佣归因=临时链接优先永久、仅站长锁佣；驿站订单赠高级线下运营商 20%、运营商 10%；商家免保证金 b 方案；灰度开关 commission_v2_attribution 默认关（开启待拍板）。
- **会员**：月19/季49/年168主推/连续包年148；AI 每日限次门控；电子书畅读。
- **角色链**：商家=商品池唯一入口 → 圈主/驿站/商城是分销渠道；站长=推广者，运营商=团队管理者；研究院=精英师资筛选（付费准入→签约讲师→驿站供给）。
- **两套虚拟资产**：灵石（充值币·消费打赏问答·不可提现）与积分/学分（免费激励·换权益）严格分轨永不互通。

---

## 七、给未来 AI 的元提示（如何用好这个库）

1. 任何任务先贴【万能头】+ 对应模板，再补具体需求——不要让 AI 裸奔进代码库。
2. AI 报告"完成"时，要求它附验证证据（tsc/jest 输出、curl 结果、commit hash）——本项目历史上出现过谎报 commit hash 和伪造拍板文档的事故，验证文化是用血换的。
3. 大任务先要方案再要代码；涉及 2+ 文件或业务规则的，方案里必须列"改动文件清单"供人工审查。
4. 每个窗口收尾：回写总账销号 + 更新记忆/交接文档。上下文不过夜。

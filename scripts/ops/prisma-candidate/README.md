# 候选 Prisma 客户端隔离

候选分支给 `schema.prisma` 加了两个字段（`CircleRevenueRecord.orderId`、`User.privacySettings`）。
工作树的 `node_modules` 是主工作区的 junction，而 `prisma generate` 默认写进 `node_modules`，
于是「按候选 schema 生成客户端」这个动作会**覆盖主工作区正在用的那一份**。

这不是理论风险，本轮实际发生了三次（见《集中接收清单》的污染时间线）。

## 做法

从真实 schema **派生**一份只改了 `generator.output` 的副本，生成到
`apps/server/.prisma-candidate/client`，完全不写 `node_modules`。

| 入口 | 用途 |
|---|---|
| `generate.mjs` | 派生 + 生成，并记录源 schema 的 sha256 |
| `client.mjs` | 候选验证脚本的唯一加载入口；同时接管进程内 `@prisma/client` 的模块解析 |
| `assert-isolation.mjs` | 11 条断言，证明「用的确实是候选客户端」且「共享目录没被污染」 |
| `tsconfig.candidate.json` | 候选侧类型检查（`paths` 指向候选客户端） |
| `jest.candidate.config.cjs` | 候选侧单测（`moduleNameMapper` 指向候选客户端） |

**都是新增文件，不修改 `apps/server/tsconfig.json` 与 `jest.config.ts`。**

## 为什么光换脚本里的导入不够

被验证的源码自己也 `import { Prisma } from "@prisma/client"`，而且不止当类型用：
`common/prisma-errors.ts` 的 `isUniqueConstraintError` 是
`e instanceof Prisma.PrismaClientKnownRequestError`。

脚本用候选客户端建连接、源码却拿共享客户端的类做 `instanceof` —— 两个类来自不同模块实例，
判断**恒为 false**。「撞唯一键」会被误判成「记账失败」，而测试仍然是绿的（行数照样对得上）。
这种失效不报错，只把结论悄悄变软。

所以 `installCandidateResolution()` 直接接管 `Module._resolveFilename`，
让进程内所有模块拿到同一份候选客户端。`assert-isolation.mjs` 的 A6 专门断言这一点。

## 用法

```bash
# 1) 生成（每次改过 schema 都要重跑；client.mjs 会用 sha256 核对新鲜度）
node scripts/ops/prisma-candidate/generate.mjs

# 2) 证明隔离成立（不连数据库）
node scripts/ops/prisma-candidate/assert-isolation.mjs

# 3) 类型检查（在 apps/server 下）
npx tsc --noEmit -p ../../scripts/ops/prisma-candidate/tsconfig.candidate.json

# 4) 单测（在 apps/server 下）
npx jest -c ../../scripts/ops/prisma-candidate/jest.candidate.config.cjs --testPathPattern "..."
```

数据库验证脚本（`circle-fulfillment-repro/*`、`privacy-preferences-verify/*`）已改为
从 `client.mjs` 取客户端，并带一道硬门禁：路径里没有 `.prisma-candidate` 就**拒绝运行**，
不让验证在「看起来通过」的状态下跑完。

## 反证：怎么知道隔离真的生效

| 配置 | 结果 |
|---|---|
| `tsc -p apps/server/tsconfig.json`（共享客户端） | **12 处类型错误**，全在候选文件里（`orderId` / `type_orderId` / `privacySettings` 不存在） |
| `tsc -p tsconfig.candidate.json`（候选客户端） | **0 处**（`@guoxue/shared/paipan` 的 3 处是工作树未构建 `packages/shared` 的既有环境问题） |

两者跑的是同一份源码，差别只有客户端。这就是隔离生效的直接证据。

## 已知边界

- `jest` 侧的类型强度未单独求证：specs 把 prisma 全 mock 了，运行时不碰真实客户端。
  **权威的类型检查是上面的 `tsc`**，jest 这里只保证模块映射指向候选（A7 断言）。
- 生成物 `apps/server/.prisma-candidate/` 不进版本库（该目录内自带 `.gitignore`）。
- 仍需 `node_modules` junction 提供 NestJS 等其余依赖；隔离的只有 Prisma 客户端这一项。

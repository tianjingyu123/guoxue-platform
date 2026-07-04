# 官网 rebu-official · 审计结论与完成计划（SEO/GEO 主阵地）

> 2026-07-04 · 审计结论（agent 深查）：总体 25%——路由框架 100%（20 路由全建）、**页面内容 0%（全空壳）**、API 集成 10%、SEO 基建 50%（sitemap/robots✅·单页 metadata/JSON-LD❌）、i18n 40%（zh/en 齐·ja/ko 文件缺失会 fallback）、无远程仓库（裸本地 3 commits）
> **定位（用户 2026-07-04 校准·与官网 CLAUDE.md 第一条一致）：SEO/GEO 的目的=品牌宣传 + 用户搜工具时第一时间找到我们 + 主要引导下载 APP。北极星=官网引导的 APP 下载/注册数（非泛流量）**
> 落点修正：①P0 增加**工具词落地页**（八字排盘/合婚/择日/起名等每个工具一个 SEO 页：说明+示例+「App 内完整体验」CTA）——工具意图搜索的下载转化率远高于古籍阅读流量 ②全站常驻智能下载引导（底部悬浮条+universal link 尝试拉起 App）③古籍/诗词内容页仍做（品牌长尾+权威感），但页内 CTA 统一指向下载

---

## 一、战略排序：先建"流量引擎"，再装"品牌门面"

官网真正值钱的不是首页多漂亮，是**程序化 SEO 内容页**——古籍/诗词全文页是成千上万个可被搜索命中的长尾入口。内容页只需干净的排版（无需 V0 设计稿），可以**立刻开工**；品牌页（首页/about/download）依赖 V0 设计稿，放第二批。

## 二、四批完成计划（普通模型任务包）

### P0 流量引擎（最高优先·不等设计稿）
1. **古籍内容页真连**：classics 列表+详情阅读器调平台 API（书/章节端点已有·apiFetch 框架在）——服务端渲染全文
2. **ISR/SSG 策略**：详情页 generateStaticParams（首批全量书目）+ revalidate 24h；章节分页 URL 化（/classics/[id]/[chapter]——每章一个可收录 URL）
3. **单页 SEO**：所有内容页 generateMetadata（书名/章节名/摘要）+ JSON-LD（Book/Article schema）+ canonical + 动态 sitemap 扩展（书×章全量入 sitemap·分片）
4. **诗词页同构**：poetry 列表/详情（60 首起步·随内容注入扩容）
5. blog 通道打通（平台文章 API→官网博客·内容复用）
- **内容策略（与主库对齐）**：官网只用主库现有精洗内容（31 部+诗词），**不另建低质语料**（宁缺毋滥是品牌决策）；内容注入批次推进多少，官网 sitemap 自动长多少
- 验收：Google Search Console 收录曲线开始爬升；任一章节页 Lighthouse SEO ≥95

### P1 品牌门面（依赖 V0 设计稿·docs/ 里的 V0 提示词已备）
首页/download（App 下载+二维码）/about/privacy+terms（法务文书上线版同步）——V0 出稿后集成；download 页接真实包/小程序码

### P2 工具体验（PC 端排盘）
与新平台策略一致：**PC 端先 iframe 嵌老站 H5 排盘**（tools 页一个入口即可用）；新工具上线后替换——零开发成本先把"官网可排盘"的 SEO 词吃住

### P3 国际化与 B 端收尾
ja/ko 翻译文件补齐（先机翻+人校 Header/Footer/首页 51 key，内容页暂 zh/en）；business/api 页（API 产品描述+联系表单·Stripe 收单等 B 端成单再接）

## 三、部署与基建决策（待拍板）

1. **域名与备案**：sitemap 硬编码 rebugx.com——该域名备案状态？**百度收录必须国内备案+国内节点**；建议主站部署 rebu-server（node+pm2+nginx·服务器余量够），Vercel 作海外镜像（Google/GEO 流量）双轨
2. **建远程仓库**：官网裸本地无远程——立即推 backup/cnb/gitee 三远程（与主仓同策略·防丢）
3. V0 设计稿排期（P1 的前置·用户侧动作：拿 docs/v0-design-prompts.md 去 V0 出稿）

## 四、与主平台的咬合

- 归因：官网全站注册/下载链接带 ref 参数（官网自己是渠道·归因基建已有）
- 内容回流：行业洞察季度报告/研究院白皮书 → 官网 blog（B 端信任弹药）
- 双向导流：官网古籍页「App 内继续阅读（进度同步）」深链

## 五、任务包汇总（普通模型·独立仓作业）

| 批 | 内容 | 验收 |
|---|---|---|
| 官-P0 | 古籍/诗词/博客真连+ISR+单页metadata+JSON-LD+sitemap分片+章节URL化 | 收录爬升·Lighthouse SEO≥95·zh/en 双语内容页 |
| 官-P1 | V0稿集成四页+法务文书页 | 品牌页全量上线 |
| 官-P2 | tools 页嵌老站H5 | PC 可排盘 |
| 官-P3 | ja/ko 补齐+business页+（后）Stripe | 四语言无 fallback 报错 |

前置动作（本周内）：推远程仓库+部署环境定型（拍板#1）。

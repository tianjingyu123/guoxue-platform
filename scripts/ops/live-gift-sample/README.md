# 直播礼物动画体验样例（可重建源码）

这是 2026-09-19 选型轮产出的隔离样例的**受版本控制副本**，用于评审与复现。
它**不是上线代码**，不参与任何构建；`apps/mobile` 不引用本目录任何文件。

原样例运行目录在 `artifacts/`（仓库按约定忽略该目录，见 `.gitignore:64`），
所以这里保留全部可维护源码与素材生成脚本，二进制依赖与截图按校验值记录、可按下述步骤重建。

## 一、重建步骤

```bash
# 1) 准备目录
mkdir -p /tmp/live-gift-sample && cp -r scripts/ops/live-gift-sample/* /tmp/live-gift-sample/
cd /tmp/live-gift-sample

# 2) 取播放器（精确版本，仅 L3 用；L1/L2 零依赖）
npm install lottie-web@5.13.0 --no-audit --no-fund
mkdir -p vendor
cp node_modules/lottie-web/build/player/lottie_light.min.js vendor/
cp node_modules/lottie-web/LICENSE.md vendor/lottie-web-LICENSE.md

# 3) 重新生成自制素材（可选，仓库里已带生成结果）
node tools/build-gift-lottie.mjs

# 4) 起本地服务并打开
python -m http.server 18790 --bind 127.0.0.1
# 浏览器打开 http://127.0.0.1:18790/

# 5) 自动化验证（只读调用主项目已装 puppeteer，不写共享 node_modules）
node tools/verify.cjs
```

页面需要 ES module 与 `fetch`，直接双击 `index.html`（`file://`）不能运行。

## 二、精确依赖与校验值

| 项 | 版本 / 来源 | 许可证 | SHA-256 |
| --- | --- | --- | --- |
| `lottie-web` | `5.13.0`（npm，发布于 2025-05-21） | MIT | 取包内 `build/player/lottie_light.min.js`：`9588432bec30c8ef8200bac4a67d8aaad881047bc2a6c9fa624d90ec96402410` |
| `puppeteer` | 主项目已装 `25.2.0`，只读调用 | — | — |
| `assets/gift-l3-ziwei.json` | 本目录 `tools/build-gift-lottie.mjs` 生成 | 自制 | `5a3e510f18aec03a675739d7d1dab9b5d85833d4fc1bb8ed75364fb2e7da51f2` |
| `assets/gift-l3-dragon.json` | 同上 | 自制 | `950212af978c8cae4c4ad88c5b2ed75c46e82ac95d9df9acda209d38a7e982d2` |

`lottie_light.min.js` 体积 168,394 B raw / 46,410 B gzip。

## 三、素材来源与授权

`assets/` 两个 Lottie 全部由 `tools/build-gift-lottie.mjs` 按几何参数生成：
圆环 trim-path 描绘、多角星缩放、沿圆周分布的小星逐颗点亮。
配色只取项目既有令牌（珠宝金 `#C9A96E`/`#D4B87D`、故宫红 `#C41E3A`、宣纸白 `#F2EDE4`）。

**这是技术验证级矢量小样，不是商用美术成品。** 它证明链路可跑、时长可控、失败可降级，
不代表正式礼物的美术质量。正式上线需要美术按同一套令牌重做，或采购授权明确的素材。

未下载、未引用任何来源不明的礼物资源；未照搬任何商业平台的专有设计。

播放器授权与素材授权是两件事：MIT 只覆盖 `lottie-web` 代码本身，不覆盖任何 `.json` 动画文件。

## 四、验证截图校验值

截图为二进制，未入库；原件在样例运行目录的 `evidence/`，校验值如下：

| 文件 | SHA-256 |
| --- | --- |
| `01-baseline.png` | `d8ad3a745aafb8b89d6f7b45c99d8d6062c46b54426293606d7fb55115116409` |
| `02-tier1-light.png` | `388b67c883e19434df99fc744acd7308c1e2aa55b6c5d4e21b75695d3a3eae9e` |
| `03-tier2-combo.png` | `86f46158231f1f6e69faa3ed3bd27f071cd8421c5357d54444ed848770a62711` |
| `04-tier3-premium.png` | `6e791d7c735f9d6d6a7a9c80944d5429611549ca7021e63f0982ed03f7b9b285` |
| `05-fallback.png` | `1a70b40028e58e767c93e7dbec681b38b0d2899cbfbd81aa006545c580c14045` |
| `06-flood.png` | `f4693bfc03fadb995cd5b6aa10a15ad1535a35f9d4b9c49060a7d6e383705a1b` |

`tools/verify.cjs` 会重新生成这些截图与 `evidence/verification.json`（19 项，上一轮全通过）。
截图内容依赖随机事件与时间点，重跑后哈希不会一致；上表用于核对交接时的原件。

## 五、与已落地代码的关系

样例里的 `src/gift-stage.js` 是**选型阶段的原型**，覆盖 L1/L2/L3 三层。
真正进入 `apps/mobile` 的是按它重写的 `apps/mobile/src/pkg-live/gift-feed.ts`，
只做 L1/L2，并补上了原型没有的东西：

- 事件归一化（送礼响应 / TIM 广播两条来源）
- 房间维度隔离与切房后拒绝旧房间迟到事件
- 去重缓存的**有效期**（原型只有容量）
- 事件过期阈值（迟到、重连补发）
- 连击超窗口后收掉旧条再开新条（原型会同键覆盖，导致上一轮累计数凭空消失）

样例继续作为 L3 的评审材料保留；L3 是否接入待打包链版本与 nvue 视频叠层两项核实后再定。

# 板块 UI 优化 · V0 协作工作流（标准流程）

> 用途：用户想优化热卜国学 App 某个板块的前端 UI 时的标准协作流程。
> 任何窗口收到"优化 XX 板块 / 改 XX 板块前端 UI"的诉求，按本文档执行。
> 核心分工：**Claude Code 打包现状 → V0 出视觉设计稿 → Claude Code 还原成 uni-app Vue3**。

---

## ⚠️ 最重要的前提（先认清，否则白干）

- 项目是 **uni-app 多端（小程序 / App / H5 · Vue3）**，**不是 React**。
- **V0（v0.dev）产出的是 React/Next 代码，不能直接用**（小程序端跑不了）。
- 所以 V0 的角色是**出视觉/交互设计稿**，Claude Code 负责**还原成 uni-app Vue3**（沿用一直的 V0→Vue3 工作法）。
- 给 V0 的包 = 让它的设计**符合项目风格规范**；拿回来的是**视觉参考**，不是成品代码。

---

## 一、触发

用户在任意窗口说：「优化 XX 板块」「改 XX 板块前端」「XX 页面 UI 升级」等。

## 二、Claude Code 侧：自动打包"板块包"（用户啥都不用给）

### ① 自己截该板块真实现状图（不用用户截）
工具在 `C:\Users\Administrator\guoxue-e2e\`（Playwright harness）。步骤：
1. **写验证码**：`ssh rebu-server 'source /opt/guoxue/.env; redis-cli -u "$REDIS_URL" SET "sms:code:LOGIN:15383869024" "123456" EX 1800; redis-cli -u "$REDIS_URL" DEL "sms:fail:15383869024"'`
2. **API 登录拿 token**：`curl -s -X POST https://api.rebugx.cn/api/v1/auth/login/sms -H 'Content-Type: application/json' -d '{"phone":"15383869024","code":"123456"}'` → 取 `data.accessToken`（15383869024 是超管测试号）
3. **生成登录态**：`cd guoxue-e2e && node make-auth.js "<token>" '{}'`（用 uni.setStorageSync 注入，生成 auth.json）
4. **截图**：Playwright `chromium` + `devices['iPhone 13']` + `storageState:'auth.json'`，`page.goto('https://api.rebugx.cn/h5/<板块路由>')` → `page.screenshot()`。板块路由查 `apps/mobile/src/pages.json` 或 `utils/router.ts`。
5. **Read 截图**自查确认截对了板块。
（登录态 auth.json 约 2h 过期，过期重跑第 1-3 步刷新。）

### ② 提炼该板块现状结构成 V0 可读的 HTML/CSS
- 找到板块页面：`apps/mobile/src/pkg-xxx/**` 或 `pages/xxx/`。
- 把 Vue 模板 + `<style scoped>` 提炼成**静态 HTML + CSS**：`<view>`→`<div>`、`rpx`→`px`(÷2)、去掉 `#ifdef` 条件编译、uni 组件(`<image>/<scroll-view>`)→标准 HTML、CSS 变量 `var(--brand)` 保留并在规范里给值。
- 目标：V0 一看就懂"现在每个元素的尺寸/颜色/间距/层级"。

### ③ 附设计规范（让 V0 产出符合风格）
从 `apps/mobile/src/uni.scss` + `App.vue` 提取 CSS token：配色（`--brand`/`--bg-paper`/`--text-ink`/`--line` 等）、字体（`--font-sans`/思源/楷体）、间距/圆角/阴影惯例。附 2-3 个代表性组件样式（按钮/卡片/导航）做"组件语言"参考。

### ④ 写给 V0 的说明书（见第三节模板）

### ⑤ 打包
把 `截图 + 现状HTML/CSS + 设计规范 + 说明书` 放一个文件夹（或 zip），给用户。包很小（几百 KB），用户直接发 V0。

## 三、给 V0 的说明书 + 输出要求（模板 · 每次填 XX 和优化目标）

```
【项目背景】
这是"热卜国学" App 的【XX 板块】，要做 UI 视觉优化。

【关键技术约束 · 必读】
- 本项目是 uni-app 多端(小程序/App/H5)，不是 React。
- 你的输出只作为【视觉设计参考】，我方工程师会还原成 uni-app Vue3。
- 因此：
  ✗ 不要用 React 组件库(shadcn/MUI/antd)、hooks、Next.js 特性、任何需要构建的东西
  ✓ 只出【纯 HTML + CSS】的视觉稿(单个 .html，能直接浏览器打开预览)

【设计规范 · 必须遵守】(见附件 tokens)
- 配色/字体/间距/圆角优先用附件的 CSS token
- 保持国学雅致风格，和 App 其他板块视觉一致

【现状】(见附件截图 + 现状HTML/CSS)
现在这个板块长这样。

【优化目标】
<用户这次具体想优化什么，如"卡片更有留白/信息层级更清晰/加毛玻璃质感"等>

【输出格式要求】
1. 一个完整的 .html 文件：优化后的 HTML 结构 + <style> 里的 CSS，能直接浏览器预览
2. 【改动说明】：列出改了哪些地方、为什么(便于我方理解设计意图后还原)
3. 保留原有的所有功能元素和信息层级，只优化视觉，别删功能
4. 用规范 token；必要的新增颜色/尺寸请标注出来
```

## 四、用户侧
把包发给 V0 → V0 按上面要求出 `.html 视觉稿 + 改动说明` → 用户把 V0 的输出发回给 Claude Code。

## 五、Claude Code 侧：还原成 uni-app Vue3
收到 V0 的 HTML/CSS 视觉稿 → 还原：`<div>`→`<view>`、`px`→`rpx`(×2)、CSS→`<style scoped lang="scss">`、颜色/字体套项目 `var(--token)`、按需加 `#ifdef` 多端适配、复用现有组件 → `vue-tsc --noEmit` 0 → 按标准流程 build + 部署。视觉对齐 V0 稿，工程实现符合项目规范。

## 关键提醒（复述）
- **V0 出 React、我们出 uni-app Vue3**：V0 只做视觉，还原是 Claude Code 的活。
- **截图 Claude Code 自己截**（Playwright + 测试号 15383869024 登录），用户不用截、不用发现状。
- 用户唯一要做的：说"优化 XX 板块" + 说清"想优化成什么样" → 拿包发 V0 → 把 V0 输出发回。
- 相关资源：e2e harness `C:\Users\Administrator\guoxue-e2e\`(make-auth.js/login.js/sweep.js)；线上 H5 `https://api.rebugx.cn/h5/`；测试超管号 15383869024(Redis 写码登录法见 [[guoxue-realdevice-test-mission]])。

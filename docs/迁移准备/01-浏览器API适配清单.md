# 浏览器 API 适配清单（React 原型 → uni-app 全端）

> 目标平台：uni-app 全端（微信小程序 + H5 + App），按最严格的**小程序约束**适配。
> 原则：100% 高保真还原。所有浏览器专有 API 必须有等价替代，且在小程序端验证可用。
> 本清单为迁移期权威对照表，逐条落实后才可进入页面迁移。

## 规模概览（决定迁移工作量）

| 维度 | 数量 |
|---|---|
| 页面 `page.tsx` | 534 |
| 组件 `.tsx` | 191 |
| `lib/api` 接口文件 | 48 |
| hooks 文件 | 14 |
| 含 mock/数组数据的页面文件 | 373 |

> 体量极大，属大型完整应用（排盘/课程/商城/圈子/IM/视频/钱包/直播/同城等）。
> 迁移须"先地基后页面"：本清单 + Canvas 适配层 + 数据层归一三项地基完成后，再按模块分批迁移。

---

## 一、存储类 API（高优先级 · 影响登录态与本地缓存）

**替代规则**：`localStorage` → `uni.getStorageSync/setStorageSync/removeStorageSync`；`sessionStorage` → 无原生对应，用内存变量或带过期标记的 storage 模拟。

建议封装统一 `lib/storage.ts`，对外暴露与原型 `useLocalStorage` 一致的接口，迁移时只换实现不动调用。

| 位置 | 用法 | 替代方案 |
|---|---|---|
| `lib/hooks/useLocalStorage.ts`（6） | local/session 读写 | 重写为 uni.*StorageSync；session 用内存 Map |
| `lib/hooks/useAuth.ts`（11） | 登录态 token/user 持久化 | uni.setStorageSync；getToken 同步读取 |
| `lib/api-client.ts`（1） | 读 auth_token | 统一走 storage 封装 |
| `components/common/daily-verse.tsx`（2） | 今日小语「当天只弹一次」标记 | uni.getStorageSync(date 比对) |
| `components/feature-guide.tsx`（3）/`components/dialogs/feature-guide.tsx`（4） | 新手引导已展示标记 | uni storage |
| `components/ai-assistant-bubble.tsx`（2） | AI 气泡提示已展示 | uni storage |
| `app/tasks/daily/page.tsx`（4） | 每日任务数据缓存 | uni storage |
| `app/courses/study-plan/page.tsx`（9） | 学习计划/目标/任务缓存 | uni storage（注意按日期 key） |
| `app/courses/[id]/player/page.tsx`（3） | 课程播放进度 | uni storage |
| `app/mine/delete-account*/page.tsx`（3） | 注销时 clear | uni.clearStorageSync |

> sessionStorage 仅 delete-account-result 用到，clear 即可，无需精确模拟。

---

## 二、Canvas 渲染（最高保真风险 · 单独立项见 02 文档）

**替代规则**：Web `CanvasRenderingContext2D` → 小程序 **Canvas 2D 新接口**（`<canvas type="2d">` + `canvas.getContext('2d')`，API 最接近 Web）。**禁用**旧版 `uni.createCanvasContext`（API 差异大、无 measureText 精度）。

| 位置 | 用途 | 风险点 |
|---|---|---|
| `lib/poster/render-engine.ts`（34） | 国风分享海报母版引擎 | 自定义思源字体须 loadFontFace；measureText 多行排版；createLinearGradient/arcTo/clip/drawImage |
| `lib/achievement/render-card.ts`（20） | 成就/证书卡片渲染 | 同上 + 印章/二维码绘制 |
| `app/courses/certificate/page.tsx`（19） | 结业证书 canvas | 字体、印章、长文换行 |
| `lib/api/poster.ts`（6）/`components/common/poster-canvas.tsx`（2）/`components/common/achievement-moment.tsx`（2） | canvas 容器与图片加载 | new Image() → uni 图片对象；跨域 |
| `app/videos/publish/page.tsx`（3）/`app/im/invite/page.tsx`（12） | 视频封面截帧/邀请图 | 视频截帧小程序需专用 API |

> 关键结论：海报/证书/成就卡是品牌传播的核心物料，必须像素级还原。
> Canvas 适配层须先做 PoC 验证字体加载与排版一致，再批量迁移。详见 `02-Canvas适配层方案.md`。

---

## 三、分享 / 剪贴板 / 媒体（中高优先级 · 分布最广，50+ 页面）

**替代规则**：
- `navigator.share` → 小程序用 `button open-type="share"` + `onShareAppMessage`（页面级），或 `uni.share`（App/H5）。**注意**：小程序无法主动调起分享，必须用户点击转发按钮；这会影响"分享喜悦"类主动分享按钮的交互设计，须改为引导用户点右上角或用转发按钮。
- `navigator.clipboard.writeText` → `uni.setClipboardData`
- `navigator.mediaDevices.getUserMedia`（录音）→ `uni.getRecorderManager`
- `navigator.geolocation` → `uni.getLocation`
- `ClipboardItem`（复制图片）→ 小程序改为保存图片到相册 `uni.saveImageToPhotosAlbum`

| 类别 | 代表位置 | 替代方案 |
|---|---|---|
| 主动分享 navigator.share | `badge-unlock`/`achievement-moment`/`share-poster` 等 15+ 处 | 改 onShareAppMessage + 转发按钮；解锁仪式「分享喜悦」需重设计交互 |
| 复制文本 clipboard.writeText | 邀请码/订单号/链接复制，30+ 处 | uni.setClipboardData |
| 复制图片 ClipboardItem | `app/common/share-poster/page.tsx` | 改保存到相册 |
| 录音 getUserMedia | `paipan/*/notes-panel.tsx`、`app/search/voice` | uni.getRecorderManager |
| 定位 geolocation | `app/same-city/feed/page.tsx` | uni.getLocation |

> ⚠️ 主动分享是本次最大交互差异：小程序限制主动调起分享。所有"分享给好友"按钮须改为
> `<button open-type="share">` 或引导转发，文案与埋点同步调整。这点会影响峰值时刻母版。

---

## 四、DOM / 窗口 / 事件（中优先级 · 多在交互与布局 hooks）

**替代规则**：小程序无 DOM，`document.*` 一律禁用，改用 Vue ref + uni API。

| 位置 | 用法 | 替代方案 |
|---|---|---|
| `hooks/use-mobile.ts`、`lib/hooks/useMediaQuery.ts`（window.matchMedia/innerWidth） | 响应式断点 | uni.getSystemInfoSync + uni.onWindowResize；或直接 rpx 自适应 |
| `components/layout/responsive-layout.tsx`（window.resize/innerWidth） | 设备类型判断 | uni.getSystemInfoSync |
| `lib/hooks/useScrollPosition.ts`、`floating-assistant.tsx`（window.scrollY/scrollTo） | 滚动监听/回顶 | page onPageScroll + uni.pageScrollTo |
| `lib/hooks/useClickOutside.ts`（document.addEventListener） | 点击外部关闭 | 改用遮罩层 catchtap 或组件失焦 |
| `image-viewer.tsx`/`discussion-sheet.tsx`（document.body.style.overflow） | 锁定背景滚动 | 弹层用 catchtouchmove 阻止穿透 |
| `feature-guide.tsx`（document.querySelector + getBoundingClientRect） | 新手引导高亮定位 | uni.createSelectorQuery().boundingClientRect() |
| `sidebar.tsx`（document.cookie/keydown） | 侧栏状态（PC 端组件） | 小程序不适用，移动端可弃用 |
| `image-viewer`/`captcha-modal`/`feature-guide`（window keydown/mouse/touch 事件） | 键鼠/触摸交互 | 小程序用 touch 事件 + 手势；键盘事件弃用 |
| `back-button.tsx`（window.history） | 返回 | uni.navigateBack |
| `home-feed.tsx`/`wallet/recharge`/`version-update-dialog`（window.location.href/reload） | 跳转/刷新 | uni.navigateTo/redirectTo/reLaunch |
| `splash-screen.tsx`（window.open 广告外链） | 打开外链 | 小程序用 web-view 或复制链接 |

---

## 五、动画 / 计时（低风险 · 多数兼容）

| 用法 | 替代方案 |
|---|---|
| `requestAnimationFrame`（home-feed/search/voice） | 小程序支持；或改 uni 动画 / CSS animation |
| `setTimeout/setInterval` | 全平台通用，无需改 |
| CSS 动画（animate-in/spin 等 Tailwind/keyframes） | 改 uni 的 CSS（rpx + transition/animation）；母版浮层动画须逐条核对 |

---

## 六、文件 / URL（中优先级 · 上传与预览）

| 用法 | 位置 | 替代方案 |
|---|---|---|
| `URL.createObjectURL`（文件预览） | im/customer-service/bots/station-config/report 等 10+ | uni.chooseImage/chooseMedia 返回临时路径，直接用 tempFilePath |
| `new Blob` / `FileReader` | 录音/上传 | uni 录音/上传 API 返回临时文件，无需 Blob |
| `document.createElement('a')` 下载 | achievement-moment/share-poster/materials 等 | 小程序用 uni.saveImageToPhotosAlbum / uni.downloadFile |
| `new Image()`（canvas 图片加载） | render 引擎/poster.ts | 小程序 canvas 2D 用 canvas.createImage() |

---

## 适配优先级总结（按迁移顺序）

1. **P0 地基**：存储封装（一、登录态）+ Canvas 适配层（二，单独 PoC）→ 不通则全盘阻塞。
2. **P0 交互范式**：主动分享受限（三）→ 影响所有分享按钮与峰值时刻母版，须先定方案。
3. **P1 通用 hooks**：响应式/滚动/点击外部/弹层滚动锁（四）→ 封装成 uni 版 composables 复用。
4. **P1 文件媒体**：上传/下载/录音/定位（三、六）→ 按模块迁移时逐页替换。
5. **P2 低风险**：动画计时（五）→ 随页面迁移自然处理。

## 建议的封装产物（Vue3 新工程内）

- `utils/storage.ts`：统一 storage（替代 useLocalStorage / useAuth 存储层）
- `utils/share.ts`：分享适配（onShareAppMessage 封装 + 复制兜底）
- `utils/canvas/`：Canvas 适配层（见 02 文档）
- `composables/useSystemInfo.ts`、`useScroll.ts`、`useClickOutside.ts`：替代 DOM hooks
- `utils/media.ts`：选图/录音/下载/保存相册/定位封装

> 下一步：产出 `02-Canvas适配层方案.md`（最高保真风险）与 `03-数据层与设计令牌.md`。

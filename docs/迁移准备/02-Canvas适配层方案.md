# Canvas 适配层方案（最高保真风险项）

> 目标：海报 / 证书 / 成就卡 / 读后小结等分享物料在 uni-app 全端**像素级还原**。
> 这是整个迁移保真度的命门——分享物料是品牌传播核心，差一个字体回退就会全盘走样。
> 策略：先做适配层 + 字体加载 PoC，验证一致后再批量迁移。

## 一、现状盘点（迁移前必须先统一）

| 渲染实现 | 文件 | 特征 | 问题 |
|---|---|---|---|
| 海报母版引擎 | `lib/poster/render-engine.ts`（34 处 ctx） | 纯函数、模板化、BRAND 常量、宣纸+鎏金+印章 | 标准母版，保留 |
| 成就卡母版引擎 | `lib/achievement/render-card.ts`（20 处 ctx） | 纯函数、宣纸肌理1400点、印章、二维码、measureText 多行 | 标准母版，保留 |
| 证书页（旧版） | `app/courses/certificate/page.tsx`（19 处 ctx） | **内联组件、硬编码颜色/文案、深蓝背景、★+Arial** | ⚠️ 早期实现，未接母版体系 |

> **关键结论**：证书页是早期独立实现，视觉（深蓝渐变、★符号、Arial）与成就卡母版（宣纸、印章、思源宋体）**不一致**。
> 迁移前应先把证书统一到 `render-card.ts` 母版（type=certificate 已支持），避免把两套样式带进 Vue3。
> 这点同时呼应之前发现的"证书页配色偏离国风"问题，迁移正是统一的好时机。

## 二、Web Canvas → 小程序 Canvas 2D API 映射

**选型**：使用小程序 **Canvas 2D 新接口**（`<canvas type="2d">` + `canvas.getContext('2d')`），它与 Web `CanvasRenderingContext2D` API 几乎一致，是保真还原的唯一正确选择。
**禁用**旧版 `uni.createCanvasContext`（无 measureText 精度、API 老旧、绘制时序难控）。

| Web API（原型用法） | 小程序 Canvas 2D | 差异/注意 |
|---|---|---|
| `canvas.getContext('2d')` | `canvas.getContext('2d')`（需先 SelectorQuery 取 node） | 获取 canvas 节点方式不同，须 fields({node:true}) |
| `ctx.scale(2,2)` 高清 | `canvas.width = w*dpr; ctx.scale(dpr,dpr)` | dpr 用 uni.getSystemInfoSync().pixelRatio |
| `ctx.fillRect / strokeRect` | 同名 | ✅ 一致 |
| `ctx.fillText / measureText` | 同名 | ✅ 一致（2D 新接口支持 measureText，多行排版可还原） |
| `ctx.createLinearGradient` | 同名 | ✅ 一致 |
| `ctx.arc / arcTo / beginPath / closePath` | 同名 | ✅ 一致（roundRect 用 arcTo 实现可直接搬） |
| `ctx.clip / save / restore / globalAlpha` | 同名 | ✅ 一致（宣纸肌理半透明叠点可还原） |
| `ctx.font = '700 30px "Noto Serif SC"'` | 同名，**但自定义字体须先 loadFontFace** | ⚠️ 见第三节，最大风险 |
| `new Image()` + onload | `canvas.createImage()` + onload | drawImage 前须等图片 load |
| `ctx.drawImage(img,...)` | 同名 | ✅ 一致；图片须 createImage 或本地临时路径 |
| `canvas.toDataURL()` | `uni.canvasToTempFilePath({canvas})` | ⚠️ 返回临时文件路径而非 dataURL；导出/保存逻辑须改 |
| `<img src={dataURL}>` 展示 | `<image src={tempFilePath}>` | 展示用 image 组件 + 临时路径 |
| `document.createElement('a')` 下载 | `uni.saveImageToPhotosAlbum({filePath})` | 须先 toTempFilePath，再保存相册（需授权） |

## 三、字体加载（保真第一风险 · 必须 PoC 验证）

原型大量使用 `"Noto Serif SC"`（思源宋体）和 `"Noto Sans SC"`（思源黑体）。
小程序 canvas **默认无这些字体**，不加载会回退到系统字体，导致：字宽变化 → measureText 测算偏移 → 多行换行位置错乱 → 整体排版走样。

**解决方案**：
1. 字体文件托管到 CDN（woff/ttf），小程序启动或绘制前调用 `uni.loadFontFace`：
   ```js
   uni.loadFontFace({
     family: 'Noto Serif SC',
     source: 'url("https://cdn.../NotoSerifSC.woff2")',
     scopes: ['webview', 'native'], // 覆盖 canvas
     success: () => { /* 字体就绪后再绘制 */ }
   })
   ```
2. **绘制时序**：必须等 loadFontFace 成功回调后再执行 canvas 绘制，否则首帧用回退字体。
3. **子集化**：思源全字库很大（10MB+），须按原型实际用到的字做子集化裁剪，否则加载慢。可考虑用思源的 CJK 子集或动态子集服务。
4. **App 端**：uni-app App 端可内置字体文件，比小程序更稳。
5. **降级策略**：字体加载失败时回退到 `Songti SC`/系统宋体（已在 FONT_SERIF 串中预留），保证不崩，但需埋点监控加载成功率。

> ⚠️ PoC 必做项：在真机小程序上绘制一张成就卡，对比字体、字宽、多行换行是否与原型截图完全一致。
> 这是 go/no-go 决策点——若字体无法可靠加载，需改用图片预渲染或服务端生成方案。

## 四、适配层接口设计（Vue3 新工程内 utils/canvas/）

把 `render-engine.ts` / `render-card.ts` 的纯绘制函数**原样保留**（它们只依赖 ctx，平台无关），
只在外层包一个"画布获取 + 字体加载 + 导出"的适配器，隔离平台差异：

```
utils/canvas/
  ├─ adapter.ts        // 获取 canvas 2D node、设置 dpr、统一 ctx 入口
  ├─ font-loader.ts    // loadFontFace 封装 + 就绪 Promise + 降级
  ├─ image-loader.ts   // canvas.createImage 封装（替代 new Image）
  ├─ export.ts         // canvasToTempFilePath + saveImageToPhotosAlbum
  └─ render/           // 直接复用原型纯函数（render-engine / render-card）
```

适配器对外暴露：
```ts
async function renderToCanvas(canvasId, renderFn, data): Promise<tempFilePath>
// 内部：取node → setSize(dpr) → await fontReady → await images → renderFn(ctx,data) → toTempFilePath
```

> 收益：纯绘制逻辑零改动（保真度天然保证），平台差异全部收敛在适配器，且 Web/小程序/App 共用一套绘制代码。

## 五、保真验收方法（每张物料逐一比对）

1. **建基准**：迁移前在 React 原型上对每类物料用 agent-browser screenshot 截图存档（海报/证书/成就卡/小结）。
2. **迁移后比对**：在小程序真机/模拟器绘制同样数据，截图与基准逐像素肉眼比对。
3. **重点核对**：字体字形、字宽换行位置、印章圆形与文字居中、鎏金边框圆角、二维码位置、宣纸肌理观感、数据网格分隔线。
4. **数据驱动一致性**：用同一组 data 跑两端，确保 measureText 多行结果一致。

## 六、迁移顺序建议

1. 先统一证书到 render-card 母版（消除两套实现）。
2. 搭 utils/canvas 适配层 + 字体 loadFontFace PoC。
3. PoC 通过 → 迁移成就卡（峰值时刻已验证视觉）。
4. 再迁海报引擎（最复杂，34 处 ctx）。
5. 最后处理视频截帧/邀请图等特殊 canvas（app/videos/publish、app/im/invite）。

> 下一步：产出 `03-数据层与设计令牌与路由表.md`。

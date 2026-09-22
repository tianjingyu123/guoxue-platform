/**
 * 罗盘圈层数据 —— 转发 packages/shared 的单一真源。
 *
 * 此前这份知识在仓库里有三个副本（后端 calculator 常量 / 共享包 / 前端静态表），
 * 且互不一致：前端曾用 `if (i % 9 === 0) push("空")` 生成，只得 8 个空亡（应 12）、
 * 64 个甲子格（应 60）、末四格是前四格副本；共享包初版则把六十甲子顺排，
 * 12 个地支山的三龙地支全部与山不符。现已收敛为共享包一处。
 *
 * 🔴 只转发**这一个子模块**，不要写成 export * from '@guoxue/shared/paipan'（整包）：
 * 整包会把奇门/六爻/大六壬三个引擎一并拖入分包
 * （主包曾因此顶穿 2MB 上限，见 src/lib/paipan/ganzhi.ts）。
 *
 * 本文件只做转发。**不要在这里写任何数据或算法**，要改就去改 shared。
 */
export * from '@guoxue/shared/paipan/luopan-rings'

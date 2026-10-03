/**
 * ⚠️ 算法真源已迁至 packages/shared/src/paipan/ganzhi.ts（2026-07-14）。
 *
 * 为什么：此前 C 端用这份前端引擎、admin 用 apps/server 的 tool-registry/calculators，
 * 两套算法实测结果大面积不同（奇门局数/值符/值使、大六壬月将全错）——
 * 管理员在后台看到的盘和用户看到的不是同一个盘。现在前后端共用 shared 那一份。
 *
 * 🔴 只转发**这一个子模块**，不要写成 export * from '@guoxue/shared/paipan'（整包）：
 * 本文件在主包里，整包转发会把奇门/六爻/大六壬三个引擎一起拖进主包，
 * 主包会直接顶穿 2MB 上限（实测 1.96MB）。
 *
 * 本文件只做转发。**不要在这里写任何算法**，要改就去改 shared。
 */
export * from '@guoxue/shared/paipan/ganzhi'

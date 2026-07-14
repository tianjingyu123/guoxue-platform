/**
 * ⚠️ 算法真源已迁至 packages/shared/src/paipan/liuyao-engine.ts（2026-07-14）。
 *
 * 为什么：此前 C 端用这份前端引擎、admin 用 apps/server 的 tool-registry/calculators，
 * 两套算法实测结果大面积不同（奇门局数/值符/值使、大六壬月将全错）——
 * 管理员在后台看到的盘和用户看到的不是同一个盘。现在前后端共用 shared 那一份。
 *
 * 本文件只做转发，保持既有 import 路径不变。**不要在这里写任何算法**，
 * 要改就去改 shared，否则又会分叉出第二个真源。
 */
export * from '@guoxue/shared/paipan'

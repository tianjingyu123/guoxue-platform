/**
 * 排盘算法 · 全平台唯一真源
 *
 * 前端（apps/mobile 的 C 端工具页）与后端（apps/server 的 tool-registry）都从这里取，
 * 保证同一个盘在任何地方算出来都一样。
 *
 * 🔴 曾经的教训：两端各有一套算法，实测奇门局数/值符/值使、大六壬月将全不一致，
 *    管理员在后台看到的盘和用户看到的不是同一个盘。别再复制第二份。
 */
export * from "./jieqi";
export * from "./ganzhi";
export * from "./qimen-engine";
export * from "./daliuren-engine";
export * from "./liuyao-engine";
export * from "./liuyao-data";

/**
 * 六爻 · 前端类型与本地摇卦
 *
 * 装卦算法已迁至服务端（shared 的 computeLiuyao 经 POST /paipan/engine/liuyao 调用），前端不再引入 shared 引擎模块。
 * 结果类型用 `import type` 推导 —— 编译时擦除，不会把 shared 的推算代码打进前端包。
 */
export type LiuyaoFullResult = ReturnType<typeof import('@guoxue/shared/paipan/liuyao-engine').computeLiuyao>

/**
 * 掷一次三枚铜钱：3 正=9（老阳）、2 正=8（少阴）、1 正=7（少阳）、0 正=6（老阴）。
 * 与 shared liuyao-engine 的 randomCoinThrow 相同；只是随机成象，不涉及装卦算法，所以留在前端（摇卦要即时反馈）。
 */
export function randomCoinThrow(): number {
  let heads = 0
  for (let i = 0; i < 3; i++) if (Math.random() < 0.5) heads++
  return heads === 3 ? 9 : heads === 2 ? 8 : heads === 1 ? 7 : 6
}

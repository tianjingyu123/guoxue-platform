// ── 六爻纳甲计算器（契约适配层）──
//
// 🔴 2026-07-14 去伪存真：本文件原先自带一套六爻实现。核对下来，
//    **装卦/纳甲/世应是对的**（同一卦时两边逐爻一致，这是六爻的核心），
//    但**时间起卦的取数法与 C 端不同** —— 同一时刻两边起出的是不同的卦
//    （2026-07-14 09:00：C 端得「水雷屯」，这里得「雷泽归妹」）。
//    起卦法确有流派之别，不算算错；但同一个平台同一时刻起出两个卦，
//    对用户就是「后台和前台说的不是一回事」。
//
//    现统一到全平台唯一真源 @guoxue/shared/paipan（73 项六爻黄金测试背书）。
//    本文件只做**契约适配**。
//
//    ⚠️ 不要在这里写任何算法。要改就去改 shared。

import type { LiuYaoResult, Yao } from "@guoxue/shared";
import { computeLiuyao } from "@guoxue/shared/paipan";

/** 六爻起卦方式：admin 传的 method → 引擎的 methodKey */
function toMethodKey(method: string): string {
  if (method === "coin" || method === "manual") return "coin";
  if (method.startsWith("number")) return "number1";
  return "time"; // auto/time 一律时间起卦（确定性，同一时辰同一卦）
}

export function calculateLiuYao(input: Record<string, unknown>): LiuYaoResult {
  const method = (input.method as string) ?? "auto";
  const datetime = (input.datetime as string) ?? new Date().toISOString();
  const d = new Date(datetime);

  const nums = (input.numbers3 as number[]) ?? (input.numbers2 as number[]);
  const r = computeLiuyao({
    year: d.getFullYear(),
    month: d.getMonth() + 1,
    day: d.getDate(),
    hour: d.getHours(),
    minute: d.getMinutes(),
    methodKey: toMethodKey(method),
    coins: input.coins as string | undefined,
    numberInput: nums?.length ? nums.join(",") : undefined,
  });

  const c = r.chart;

  // 引擎的 lines 是自上而下（position 6→1），admin 的 Yao 是 1=初爻，按位补齐
  const yaos: Yao[] = c.lines
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      position: l.position,
      type: l.benYao === "yang" ? "阳" : "阴",
      naJia: `${l.benGan}${l.benLiuqin.split(" ").pop() ?? ""}`,
      liuQin: l.benLiuqin.split(" ")[0] ?? "",
      liuShou: l.liushen,
      shiYing: l.shiying ?? null,
      wuXing: (l.benLiuqin.match(/[金木水火土]/) ?? [""])[0],
      isDongYao: !!l.movingMark,
    })) as unknown as Yao[];

  const hex = (name: string) => ({ name, symbol: "", upper: "", lower: "" });

  return {
    input: { method, datetime } as never,
    benGua: hex(c.benShort),
    bianGua: c.bianShort && c.bianShort !== c.benShort ? hex(c.bianShort) : undefined,
    yaos,
    shiYao: c.shiPos,
    yingYao: c.yingPos,
    guaGong: c.palace,
    wuXing: c.benTag,
    summary: `${c.benName}${c.bianShort && c.bianShort !== c.benShort ? ` → ${c.bianName}` : ""} · ${c.palace}宫 · 世${c.shiPos}应${c.yingPos}`,
  } as unknown as LiuYaoResult;
}

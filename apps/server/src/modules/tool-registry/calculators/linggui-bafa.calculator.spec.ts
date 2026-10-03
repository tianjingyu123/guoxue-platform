import { calculateLingGuiBaFa } from "./linggui-bafa.calculator";
import { calcRiZhu } from "@guoxue/bazi-engine";

/**
 * 灵龟八法的日干支基准（2026-09-19）。
 *
 * 修之前这里自己手搓日干支，注释写「以 2000-01-01 = 甲午为基准」，
 * 而 2000-01-01 实为**戊午**——基准日错了四位天干。
 * 拿已核验的 `calcRiZhu` 比对 400 天，**400/400 全不一致**。
 *
 * 这在灵龟八法里是致命的：开穴序号由日干、日支、时干、时支四个基数相加取模而来，
 * 日干偏四位，开出来的穴就全是错的——而这是个按时取穴的针灸工具。
 *
 * 现已改用同一份引擎。这组用例把日干支钉死，避免再有人「优化」成手搓公式。
 */
describe("灵龟八法：日干支基准", () => {
  it("2000-01-01 是戊午，不是甲午（旧实现的基准日错在这里）", () => {
    const r = calcRiZhu(2000, 1, 1) as any;
    expect(`${r.gan}${r.zhi}`).toBe("戊午");
  });

  it("排出的日干支与已核验引擎逐日一致（抽 120 天）", () => {
    for (let i = 0; i < 120; i++) {
      const d = new Date(2024, 0, 1 + i * 3);
      const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
      const res: any = calculateLingGuiBaFa({ date: `${y}-${m}-${day}`, shiChen: "午" });
      const ref: any = calcRiZhu(y, m, day);
      // 日干支写在 summary 与 description 里（「（甲子日）」），从那里取
      expect(`${y}-${m}-${day} 含日柱${ref.gan}${ref.zhi}`).toBe(
        `${y}-${m}-${day} ${String(res.summary).includes(`${ref.gan}${ref.zhi}日`) ? `含日柱${ref.gan}${ref.zhi}` : `实际=${String(res.summary).match(/（(..)日）/)?.[1]}`}`,
      );
    }
  });

  it("开穴随日干支变化，不是恒定值", () => {
    const xue = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const d = new Date(2024, 5, 1 + i);
      const r: any = calculateLingGuiBaFa({
        date: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`,
        shiChen: "午",
      });
      xue.add(String(r.result?.kaiXue ?? ""));
    }
    expect(xue.size).toBeGreaterThan(1);
  });

  /**
   * 《针灸大成·八法逐日干支歌》：
   *   甲己辰戌丑未十，乙庚申酉九为期，丁壬寅卯八成数，
   *   戊癸巳午七相宜，丙辛亥子亦七数。
   * 修之前日支表十二个错十一个，所以这里逐支钉死。
   */
  it("日支配数合《八法逐日干支歌》（修前 12 个错 11 个）", () => {
    const WANT: Record<string, number> = {
      辰: 10, 戌: 10, 丑: 10, 未: 10, 申: 9, 酉: 9,
      寅: 8, 卯: 8, 巳: 7, 午: 7, 亥: 7, 子: 7,
    };
    // 从 summary 的「基数：a+b=c」里取第二个数即日支基数。
    // 注意干支配对只有阳干配阳支、阴干配阴支——甲丑、甲卯这些在六十甲子里根本不存在，
    // 所以阳支（子寅辰午申戌）拿甲日取样，阴支（丑卯巳未酉亥）拿乙日取样。
    const YANG_ZHI = ["子", "寅", "辰", "午", "申", "戌"];
    for (const [zhi, want] of Object.entries(WANT)) {
      const gan = YANG_ZHI.includes(zhi) ? "甲" : "乙";
      let got: string | undefined;
      for (let i = 0; i < 400 && got === undefined; i++) {
        const d = new Date(2024, 0, 1 + i);
        const r: any = calcRiZhu(d.getFullYear(), d.getMonth() + 1, d.getDate());
        if (r.gan !== gan || r.zhi !== zhi) continue;
        const res: any = calculateLingGuiBaFa({
          date: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, shiChen: "午",
        });
        got = String(res.summary).match(/基数：(\d+)\+(\d+)=/)?.[2];
      }
      expect(`${gan}${zhi}日 日支基数=${got ?? "未取到样本"}`).toBe(`${gan}${zhi}日 日支基数=${want}`);
    }
  });

  /**
   * 《八法临时干支歌》末句：「阳日除九阴除六，不及零余穴下推。」
   * 修之前恒除九。阴日除六的后果是余数只落 1–6，
   * 这是该法本身的性质，一并在此记录。
   */
  it("阳日除九、阴日除六（修前恒除九）", () => {
    const yangGan = "甲丙戊庚壬";
    let yangMax = 0, yinMax = 0;
    for (let i = 0; i < 200; i++) {
      const d = new Date(2024, 0, 1 + i);
      const ref: any = calcRiZhu(d.getFullYear(), d.getMonth() + 1, d.getDate());
      for (const sc of ["子", "寅", "辰", "午", "申", "戌"]) {
        const res: any = calculateLingGuiBaFa({
          date: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, shiChen: sc,
        });
        const n = Number(String(res.summary).match(/总分：(\d+)/)?.[1] ?? 0);
        if (yangGan.includes(ref.gan)) yangMax = Math.max(yangMax, n);
        else yinMax = Math.max(yinMax, n);
      }
    }
    expect(`阳日最大宫数=${yangMax}`).toBe("阳日最大宫数=9");
    expect(`阴日最大宫数=${yinMax}`).toBe("阴日最大宫数=6");
  });
});

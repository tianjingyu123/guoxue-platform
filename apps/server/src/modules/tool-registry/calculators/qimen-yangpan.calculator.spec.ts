import { calculateQimenYang } from "./qimen.calculator";

// ── 阳盘命理奇门：安干(暗干)/地盘神/十二长生 算法验证 ──
// 采用「性质不变量 + 独立重算交叉验证」，非快照对拍，确保算法符合定义而非循环论证。
// 出处：暗干飞宫法/八门含干见《奇门遁甲暗干的排法》；十二长生见《三命通会·十二长生》。

const GAN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const DI_ZHI = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
// 地盘九星固定（坎1宫起）
const JIU_XING = ["天蓬","天芮","天冲","天辅","天禽","天心","天柱","天任","天英"];
const BA_SHEN_YANG = ["值符","螣蛇","太阴","六合","勾陈","朱雀","九地","九天"];
const BA_SHEN_YIN = ["值符","九天","九地","玄武","白虎","六合","太阴","螣蛇"];
const AN_GAN_ORDER = ["戊","己","庚","辛","壬","癸","丁","丙","乙"];
const CHANG_SHENG_SEQ = ["长生","沐浴","冠带","临官","帝旺","衰","病","死","墓","绝","胎","养"];

// 八门→地盘本宫序号(1-9)：休坎1 死坤2 伤震3 杜巽4 开乾6 惊兑7 生艮8 景离9
const MEN_HOME_INDEX: Record<string, number> = {
  "休": 1, "死": 2, "伤": 3, "杜": 4, "开": 6, "惊": 7, "生": 8, "景": 9,
};
// 宫序号→纳支（洛书后天八卦，多支取本气）
const GONG_ZHI_BY_INDEX: Record<number, string> = { 1:"子",2:"申",3:"卯",4:"辰",5:"辰",6:"戌",7:"酉",8:"丑",9:"午" };

// 独立实现的十二长生（与被测代码不共享，用于交叉验证）
const CHANG_SHENG_ZHI: Record<string, string> = {
  "甲":"亥","乙":"午","丙":"寅","丁":"酉","戊":"寅","己":"酉","庚":"巳","辛":"子","壬":"申","癸":"卯",
};
function diShiRef(gan: string, zhi: string): string {
  const csZhi = CHANG_SHENG_ZHI[gan];
  if (!csZhi) return "";
  const csIdx = DI_ZHI.indexOf(csZhi);
  const zhiIdx = DI_ZHI.indexOf(zhi);
  const yin = "乙丁己辛癸".includes(gan);
  const off = yin ? (csIdx - zhiIdx + 12) % 12 : (zhiIdx - csIdx + 12) % 12;
  return CHANG_SHENG_SEQ[off];
}

function byIndex(gongs: any[]): Record<number, any> {
  const m: Record<number, any> = {};
  for (const g of gongs) m[g.index] = g;
  return m;
}

const CASES = [
  { label: "阳遁·值使门起", datetime: "2024-01-15T10:00:00", anganMethod: "zhishi" },
  { label: "阳遁·门地盘起", datetime: "2024-01-15T10:00:00", anganMethod: "dipan" },
  { label: "阴遁·值使门起", datetime: "2024-07-15T10:00:00", anganMethod: "zhishi" },
  { label: "阴遁·门地盘起", datetime: "2024-07-15T10:00:00", anganMethod: "dipan" },
];

describe("阳盘命理奇门 安干/地盘神/十二长生", () => {
  for (const c of CASES) {
    describe(c.label, () => {
      const res: any = calculateQimenYang({ datetime: c.datetime, anganMethod: c.anganMethod });
      const gongs: any[] = res.gongs;
      const map = byIndex(gongs);

      it("九宫齐全且字段类型有效", () => {
        expect(gongs).toHaveLength(9);
        for (const g of gongs) {
          expect(GAN).toContain(g.anGan);
          expect([...BA_SHEN_YANG, ...BA_SHEN_YIN]).toContain(g.dipanShen);
          expect(CHANG_SHENG_SEQ).toContain(g.changsheng.tian);
          expect(CHANG_SHENG_SEQ).toContain(g.changsheng.an);
        }
      });

      it("十二长生与独立重算一致（天盘干 + 安干 在本宫地支）", () => {
        for (const g of gongs) {
          const zhi = GONG_ZHI_BY_INDEX[g.index];
          expect(g.changsheng.tian).toBe(diShiRef(g.tianPan, zhi));
          expect(g.changsheng.an).toBe(diShiRef(g.anGan, zhi));
        }
      });

      it("地盘神：旬首宫(值符星地盘本宫)为值符，且八宫八神各一", () => {
        // 值符星地盘本宫 = 地盘九星中值符星的固定位（非中宫时）
        const zhiFuStarHome = JIU_XING.indexOf(res.zhiFu) + 1;
        if (res.zhiFu !== "天禽") {
          expect(map[zhiFuStarHome].dipanShen).toBe("值符");
        }
        const expectShen = res.dunType === "yang" ? BA_SHEN_YANG : BA_SHEN_YIN;
        const outerShen = gongs.filter(g => g.index !== 5).map(g => g.dipanShen).sort();
        expect(outerShen).toEqual([...expectShen].sort());
      });

      if (c.anganMethod === "dipan") {
        it("门地盘起：某宫安干 = 该宫八门在元旦盘本宫的地盘奇仪", () => {
          for (const g of gongs) {
            if (g.index === 5) continue; // 中宫寄宫另算
            const homeIdx = MEN_HOME_INDEX[g.men];
            expect(homeIdx).toBeDefined();
            expect(g.anGan).toBe(map[homeIdx].diPan);
          }
        });
      } else {
        it("值使门起：九宫安干恰为「戊己庚辛壬癸丁丙乙」各一次", () => {
          const all = gongs.map(g => g.anGan).sort();
          expect(all).toEqual([...AN_GAN_ORDER].sort());
        });

        it("值使门起：沿洛书宫序飞布连续（阳顺阴逆）", () => {
          // gongs[i] 对应宫序号 i+1（坎1→离9 即洛书序）
          const ordered = [...gongs].sort((a, b) => a.index - b.index);
          const yang = res.dunType === "yang";
          for (let i = 0; i < 8; i++) {
            const cur = AN_GAN_ORDER.indexOf(ordered[i].anGan);
            const nxt = AN_GAN_ORDER.indexOf(ordered[i + 1].anGan);
            const diff = (nxt - cur + 9) % 9;
            expect(diff).toBe(yang ? 1 : 8);
          }
        });
      }
    });
  }
});

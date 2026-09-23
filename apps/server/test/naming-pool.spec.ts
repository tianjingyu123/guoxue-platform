import {
  GUIFAN_LEVEL1, GUIFAN_LEVEL2, GUIFAN_LEVEL3,
  isGuifanHanzi, guifanLevel, namingCharOf, pickNamingChars, poolStats,
} from "@guoxue/shared/paipan";

/**
 * 起名字库底池（2026-09-19，接续文档 §2.95）
 *
 * ══ 起因 ══
 *
 * 决策人：「你库里就那么几个字几个名字的话没有任何价值，一定要够多还要适合。」
 *
 * 原前端 `CHAR_POOL` 只有 159 字，按风格＋喜用五行过滤后有效池仅 9–26 个，
 * 双名组合 72–650 种却要输出 60 个候选——`auspicious` 风格几乎把能组的全倒出来了。
 * 加上打分完全确定性（同姓＋同八字＋同风格恒得同一批 60 个名字），
 * 这个工具在 6M 用户规模下本身就是重名制造机。
 *
 * ══ 底池取国家标准，不是随便找一份「起名常用字」 ══
 *
 * 《通用规范汉字表》（教育部、国家语委 2013-06-05 颁布）收字 8105，
 * 分三级：一级 3500、二级 3000、三级 1605。
 * 户口登记用字须为规范汉字，所以这张表既是「够多」的来源，也是「能上户口」的保证。
 */

describe("通用规范汉字表：字数与国标逐级吻合", () => {
  it("一级 3500 / 二级 3000 / 三级 1605", () => {
    expect(`一级=${GUIFAN_LEVEL1.size}`).toBe("一级=3500");
    expect(`二级=${GUIFAN_LEVEL2.size}`).toBe("二级=3000");
    expect(`三级=${GUIFAN_LEVEL3.size}`).toBe("三级=1605");
  });

  it("三级合计 8105，且三级之间互不重叠", () => {
    const all = new Set([...GUIFAN_LEVEL1, ...GUIFAN_LEVEL2, ...GUIFAN_LEVEL3]);
    expect(`合计=${all.size}`).toBe("合计=8105");
    expect(`一二交=${[...GUIFAN_LEVEL1].filter((c) => GUIFAN_LEVEL2.has(c)).length}`).toBe("一二交=0");
    expect(`二三交=${[...GUIFAN_LEVEL2].filter((c) => GUIFAN_LEVEL3.has(c)).length}`).toBe("二三交=0");
  });

  it("级别查询自洽", () => {
    expect(guifanLevel("一")).toBe(1);
    expect(guifanLevel("梓")).toBe(2);   // 热门起名字，落在二级
    expect(guifanLevel("\u{20BB7}")).toBeNull();
    expect(isGuifanHanzi("明")).toBe(true);
    expect(isGuifanHanzi("\u{20BB7}")).toBe(false);
  });
});

describe("一级字表的数据完备性（进评分的前提）", () => {
  /**
   * 笔画、五行、拼音三者缺一，这个字就进不了评分。
   * 一级 3500 字**必须零缺失**，否则「喜用五行选不出字」这类问题会随机出现。
   */
  it("一级 3500 字的笔画/五行/拼音零缺失", () => {
    const bad = [...GUIFAN_LEVEL1].filter((c) => namingCharOf(c) === null);
    expect(`缺数据=${bad.length} ${bad.slice(0, 10).join("")}`).toBe("缺数据=0 ");
  });

  it("字属性取值合法（笔画为正、声调 0–4、五行为五者之一）", () => {
    const WX = new Set(["金", "木", "水", "火", "土"]);
    for (const c of [..."明浩然梓萱睿瑶彦"]) {
      const n = namingCharOf(c)!;
      expect(`${c} 笔画>0=${n.stroke > 0}`).toBe(`${c} 笔画>0=true`);
      expect(`${c} 声调=${n.tone >= 0 && n.tone <= 4}`).toBe(`${c} 声调=true`);
      expect(`${c} 五行=${WX.has(n.wuXing)}`).toBe(`${c} 五行=true`);
    }
  });

  it("抽样字的笔画与五行与康熙表一致", () => {
    expect(namingCharOf("明")).toMatchObject({ stroke: 8, wuXing: "火", pinyin: "ming2", tone: 2 });
    expect(namingCharOf("浩")).toMatchObject({ stroke: 11, wuXing: "水", tone: 4 });
  });
});

describe("起名池必须含二级——数据推翻了「只取一级」的初判", () => {
  /**
   * 最初只打算取一级 3500（常用好认）。拿 27 个当下热门起名字一验，
   * **12 个落在二级**：梓萱睿瑶芷懿彦昀珩玥绾黛——「梓涵」首字就在二级。
   * 只取一级会把这批全漏掉，而它们恰是用户想要的。
   */
  const HOT = [..."梓涵轩宇浩然子萱睿晨欣怡乐辰沐瑶芷若嘉懿彦昀珩玥禾绾黛"];

  it("热门起名字无一落在规范表之外（说明一二级已足够覆盖）", () => {
    const outside = HOT.filter((c) => !isGuifanHanzi(c));
    expect(`表外=${outside.join("")}`).toBe("表外=");
  });

  it("其中近半在二级，只取一级会漏掉", () => {
    const lv2 = HOT.filter((c) => guifanLevel(c) === 2);
    expect(lv2.length).toBeGreaterThanOrEqual(10);
    expect(lv2.join("")).toContain("梓");
  });

  it("默认取一级＋二级，热门字全部可选中", () => {
    const pool = new Set(pickNamingChars().map((x) => x.char));
    const miss = HOT.filter((c) => !pool.has(c));
    expect(`漏选=${miss.join("")}`).toBe("漏选=");
  });

  it("三级不入默认池（生僻字取了名别人不认识）", () => {
    const pool = new Set(pickNamingChars().map((x) => x.char));
    const lv3In = [...GUIFAN_LEVEL3].filter((c) => pool.has(c));
    expect(`三级混入=${lv3In.length}`).toBe("三级混入=0");
  });
});

describe("底池规模：解决重名的前提", () => {
  it("每个五行都有上千字可选，组合空间以百万计", () => {
    const rows = (["金", "木", "水", "火", "土"] as const).map((wx) => {
      const n = pickNamingChars({ wuXing: wx }).length;
      return { wx, n, combos: n * (n - 1) };
    });
    for (const r of rows) {
      // 原实现按喜用五行过滤后有效池只剩 9–26 个，双名组合 72–650 种
      expect(`${r.wx} 字数>1000=${r.n > 1000}`).toBe(`${r.wx} 字数>1000=true`);
      expect(`${r.wx} 组合>100万=${r.combos > 1_000_000}`).toBe(`${r.wx} 组合>100万=true`);
    }
  });

  it("按笔画区间取字（配五格时用）能取到足量候选", () => {
    const r = pickNamingChars({ wuXing: "木", strokeRange: [9, 13] });
    expect(r.length).toBeGreaterThan(100);
    for (const x of r) expect(x.stroke).toBeGreaterThanOrEqual(9);
    for (const x of r) expect(x.stroke).toBeLessThanOrEqual(13);
  });

  it("五行分布均衡，不会某一行选不出字", () => {
    const counts = (["金", "木", "水", "火", "土"] as const).map((wx) => pickNamingChars({ wuXing: wx }).length);
    const ratio = Math.max(...counts) / Math.min(...counts);
    expect(`最大最小比=${ratio < 2}`).toBe("最大最小比=true");
  });

  it("体检：一级零缺失", () => {
    const s = poolStats();
    expect(`一级可用=${s.byLevel[1]}`).toBe("一级可用=3500");
  });
});

// ═══════════════════════════════════════════════════════════
// 典籍用字与二字组合
// ═══════════════════════════════════════════════════════════

import {
  DIANJI_SIZE, DIANJI_BIGRAM_SIZE, dianjiOf, dianjiFreq, dianjiTier,
  dianjiCharSet, dianjiStats, dianjiPhraseOf, dianjiPhrases,
  DIANJI_SHICI_SIZE, isShiCiPhrase, dianjiShiCiPhrases,
  reviewPhrase, phraseGender, reviewedPhrases, avoidCategoryOf,
} from "@guoxue/shared/paipan";

/**
 * 语料：`chinese-poetry` 的楚辞全本 ＋ 唐诗两万首 ＋ 宋词两万首，
 * 合 40,076 篇、297 万字。
 *
 * 用典籍字频当适名依据的理由：在诗文里反复出现的字，
 * 本就是历代文人选过一遍的；且**顺带解决「诗词出处」这个产品字段**。
 */
describe("典籍用字：字频与出处", () => {
  it("覆盖起名池的大部分", () => {
    expect(DIANJI_SIZE).toBeGreaterThan(5000);
  });

  it("每个收录字都带真实诗句与出处", () => {
    for (const c of [..."梓萱睿瑶芷宇轩涵"]) {
      const d = dianjiOf(c)!;
      expect(`${c} 有出处=${!!d}`).toBe(`${c} 有出处=true`);
      expect(d.quote).toContain(c);            // 诗句里必须真的含这个字
      expect(d.source.length).toBeGreaterThan(1);
      expect(d.freq).toBeGreaterThan(0);
    }
  });

  it("频次能区分热门起名字与荒唐字（这是本表的判别力）", () => {
    // 热门起名字在典籍中频次显著
    for (const c of [..."子然若瑶宇晨浩嘉轩"]) expect(`${c}>=100`).toBe(`${dianjiFreq(c) >= 100 ? c : "×"}>=100`);
    // 先前生成的怪名用字几乎全在低频
    for (const c of [..."匾跞跆靰蛞棰毯靸筲觇"]) expect(`${c}<=10`).toBe(`${dianjiFreq(c) <= 10 ? c : "×"}<=10`);
  });

  it("层级是描述事实（常见/见于典籍/罕见），不是下判断（宜用/忌用）", () => {
    expect(dianjiTier("子")).toBe("常见");
    expect(dianjiTier("匾")).toBe("未见");
    const s = dianjiStats();
    expect(s["常见"] + s["见于典籍"] + s["罕见"]).toBe(DIANJI_SIZE);
  });

  it("字表可按门槛取，且能补入典籍未见的现代起名字", () => {
    const plain = dianjiCharSet(100);
    // 昀、玥 在楚辞唐诗宋词中一次都没出现过，但确是现代起名常用字
    expect(plain.has("昀")).toBe(false);
    expect(plain.has("玥")).toBe(false);
    const withExtra = dianjiCharSet(100, "昀玥");
    expect(withExtra.has("昀")).toBe(true);
    expect(withExtra.size).toBe(plain.size + 2);
  });

  it("门槛越高字表越小", () => {
    expect(dianjiCharSet(300).size).toBeLessThan(dianjiCharSet(100).size);
    expect(dianjiCharSet(100).size).toBeLessThan(dianjiCharSet(20).size);
  });
});

describe("典籍二字组合：诗词取名的真实做法", () => {
  /**
   * 单字组合这条路撞了三次墙（部首过滤 17%、字义抽取 50%、字频滤不掉贬义），
   * 症结是**贬义判断从字频推不出来**。
   * 换成「从诗文取现成的词」就通了——词是否雅驯已由历代文人写诗时筛过一遍。
   */
  it("收录近万条，均带出处", () => {
    expect(DIANJI_BIGRAM_SIZE).toBeGreaterThan(9000);
    for (const w of ["千里", "明月", "芳草", "青山"]) {
      const p = dianjiPhraseOf(w)!;
      expect(`${w} 收录=${!!p}`).toBe(`${w} 收录=true`);
      expect(p.quote).toContain(w);
      expect(p.freq).toBeGreaterThanOrEqual(20);
    }
  });

  it("高频段确为雅驯之词（前 20 位抽查）", () => {
    const top = dianjiPhrases().slice(0, 20).map((p) => p.word);
    for (const w of ["千里", "东风", "相思", "明月", "江南"]) expect(top).toContain(w);
  });

  it("双字均在起名池内、非叠字", () => {
    for (const p of dianjiPhrases().slice(0, 500)) {
      expect(`${p.word} 长度=${[...p.word].length}`).toBe(`${p.word} 长度=2`);
      expect(p.word[0]).not.toBe(p.word[1]);
    }
  });

  it("支持接入人工审定名单（filter 钩子）", () => {
    const banned = new Set(["深恨", "痴绝", "夷狄"]);
    const out = dianjiPhrases(20, (p) => !banned.has(p.word));
    for (const w of banned) expect(out.find((p) => p.word === w)).toBeUndefined();
  });

  it("门槛越高条数越少", () => {
    expect(dianjiPhrases(100).length).toBeLessThan(dianjiPhrases(20).length);
  });
});

describe("实词性组合：频次与适名度在高频段反相关", () => {
  /**
   * 先前按「频次＋是否词典词」排序，结果**排反了**——
   * 榜首是何处、今日、如今、如此、不如、惟有（全是虚词），
   * 末尾却是菡萏、婉娩、晴岚、豆蔻（最好的名料）。
   * 这类虚词在诗里最常见、也确实是词典词，两项信号都满分。
   * **「常见」与「适合入名」在高频段是两回事。**
   *
   * 真正的区分是虚词 vs 实词，而文言虚词是可枚举的闭集——
   * 不需要语义数据，也不需要我的口味。
   */
  it("滤掉含虚词者后仍有七千余条", () => {
    expect(DIANJI_SHICI_SIZE).toBeGreaterThan(7000);
    expect(DIANJI_SHICI_SIZE).toBeLessThan(DIANJI_BIGRAM_SIZE);
  });

  it("高频虚词组合被滤掉（这是本层的目的）", () => {
    for (const w of ["何处", "不知", "不可", "何事", "如何", "如此", "不如", "无人", "惟有"]) {
      expect(`${w} 被滤=${!isShiCiPhrase(w)}`).toBe(`${w} 被滤=true`);
    }
  });

  it("好名料全部保留（第一版虚词表过宽，曾把这些误滤）", () => {
    for (const w of ["千里", "东风", "明月", "相思", "江南", "少年", "青山", "菡萏", "婉娩", "晴岚"]) {
      expect(`${w} 保留=${isShiCiPhrase(w)}`).toBe(`${w} 保留=true`);
    }
  });

  it("实词清单是二字组合表的真子集，且每条都能查到出处", () => {
    const list = dianjiShiCiPhrases();
    expect(list.length).toBe(DIANJI_SHICI_SIZE);
    for (const p of list.slice(0, 300)) {
      expect(dianjiPhraseOf(p.word)).not.toBeNull();
      expect(p.quote).toContain(p.word);
    }
  });

  it("仍支持接入人工审定名单——本层只缩小候选，不替代人工", () => {
    const banned = new Set(["堪愁", "难禁", "障泥"]);
    const out = dianjiShiCiPhrases(20, (p) => !banned.has(p.word));
    for (const w of banned) expect(out.find((p) => p.word === w)).toBeUndefined();
  });
});

describe("起名宜忌审定（人工判断层，判据可复核）", () => {
  /**
   * 决策人 2026-09-19：「你先审一下，看看哪些字不适合做名字，
   * 哪些组合好的名字不适合做名字，男名女名还要有区分。」
   *
   * 这一层是**判断不是数据**。判据逐条写在 `naming-review.ts` 的常量里，
   * 不同意某一类或某个字的直接改常量，不必读逻辑——
   * 这比把口味藏在算法里好得多。
   */
  it("审定后仍余七千余条（剔除比例应在一成以内）", () => {
    const all = dianjiShiCiPhrases();
    const pass = all.filter((p) => reviewPhrase(p.word).ok);
    expect(pass.length).toBeGreaterThan(7000);
    expect((all.length - pass.length) / all.length).toBeLessThan(0.1);
  });

  it("确有问题的组合被剔除", () => {
    for (const w of ["寂寞", "憔悴", "凄凉", "断肠", "零落", "飘零", "多病", "生死", "白骨", "蟋蟀", "断魂", "目断"]) {
      expect(`${w} 剔除=${!reviewPhrase(w).ok}`).toBe(`${w} 剔除=true`);
    }
  });

  /**
   * 首版判据过宽，误杀了一批最好的名料。两轮修正记录在 `naming-review.ts`：
   * 寒（岁寒三友非贫困）、斗（星宿非争斗）、肌甲（冰肌玉骨／干支）、
   * 难妖（副词／妖娆之美）、狂（洒脱非贬义）、蟾（蟾宫折桂是吉语）、
   * 琉璃珊瑚（本就有人用作名）、落零（落花落日是美景，问题在「零落/飘零」这类组合）。
   *
   * **教训与虚词表那次相同：宁可漏掉几个让人工再审，也不要把好字误杀。**
   */
  it("两轮修正后不再误杀好名料", () => {
    for (const w of ["寒梅", "岁寒", "北斗", "星斗", "冰肌", "甲子", "难忘", "妖娆", "疏狂",
                     "蟾宫", "琉璃", "珊瑚", "落花", "落日", "清绝", "乾坤", "麒麟", "芙蓉"]) {
      expect(`${w} 保留=${reviewPhrase(w).ok}`).toBe(`${w} 保留=true`);
    }
  });

  it("非名料的写景短语按组合剔除（单字无罪，合起来不成名）", () => {
    for (const w of ["夜深", "深院", "花深", "山深", "日暮", "黄昏"]) {
      expect(`${w} 剔除=${!reviewPhrase(w).ok}`).toBe(`${w} 剔除=true`);
    }
  });

  it("剔除原因带类别名，可追溯可复核", () => {
    const r = reviewPhrase("憔悴");
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toMatch(/负面情绪/);
    expect(avoidCategoryOf("憔")).toBe("负面情绪");
    expect(avoidCategoryOf("瑶")).toBeNull();
  });

  it("性别倾向：女部花草玉石偏女，山岳志向偏男，其余中性", () => {
    expect(phraseGender("芙蓉")).toBe("female");
    expect(phraseGender("胭脂")).toBe("female");
    expect(phraseGender("乾坤")).toBe("male");
    expect(phraseGender("麒麟")).toBe("male");
    expect(phraseGender("明月")).toBe("neutral");
    expect(phraseGender("千里")).toBe("neutral");
  });

  it("中性占绝大多数——这是实情，不是判据没生效", () => {
    const pass = dianjiShiCiPhrases().filter((p) => reviewPhrase(p.word).ok);
    const neutral = pass.filter((p) => phraseGender(p.word) === "neutral").length;
    // 千里、东风、明月、相思、江南这类本就男女皆宜
    expect(neutral / pass.length).toBeGreaterThan(0.8);
  });

  it("性别是排序不是过滤——异性向的仍在清单内，只是排后", () => {
    const all = dianjiShiCiPhrases();
    const forFemale = reviewedPhrases(all, { gender: "female" });
    const forNeutral = reviewedPhrases(all);
    expect(forFemale.length).toBe(forNeutral.length);      // 条数不变，只是顺序变
    expect(forFemale[0].gender).toBe("female");            // 同性优先
    expect(forFemale[forFemale.length - 1].gender).toBe("male"); // 异性殿后但未剔除
  });

  it("需留意的字给提示但不剔除（昏、暮、神、仙这类看搭配）", () => {
    const r = reviewPhrase("神仙");
    expect(r.ok).toBe(true);
    expect(r.cautions.length).toBeGreaterThan(0);
  });
});

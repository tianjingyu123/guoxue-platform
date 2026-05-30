# V0 前端 API 完整接入指南

## 通用规则

| 项目 | 说明 |
|------|------|
| 基础路径 | `/api/v1` |
| 计算端点 | `POST /api/v1/tools/:toolId/calculate` |
| 请求头 | `Content-Type: application/json` |
| 响应格式 | `{ code: 200, data: { toolId, result, durationMs }, message: "ok" }`，排盘数据在 `data.result` |
| 时间格式 | ISO 8601 带时区 `"2026-05-19T14:30:00+08:00"` |
| 状态标记 | **已就绪**=算法完整可调 / **占位**=接口走通但算法待升级 / **精简**=基础功能可用 |

---

## 一、八字紫微

### 1. 八字排盘 `toolId = "bazi"` **已就绪**

**入参：**
```ts
{
  name: string;           // 姓名
  gender: "男" | "女";
  year: number;           // 公历年 1900-2100
  month: number;          // 1-12
  day: number;            // 1-31
  hour: number;           // 0-23
  minute?: number;        // 0-59
  city?: string;          // 出生城市（真太阳时用）
  trueSolar?: boolean;    // 真太阳时，默认 false
  ziShiMode?: "traditional" | "early-late";  // 早晚子时
  daylightSaving?: boolean;  // 夏令时
}
```

**返回核心字段：**
```ts
{
  siZhu: { nian, yue, ri, shi: Pillar };   // ★ 四柱
  qiYun: { startAge, startYear, daYun[] }; // ★ 起运+大运
  shenSha: ShenShaItem[];                   // 神煞
  geJu?: { name, type, yongShen, xiShen, jiShen, desc }; // ★ 格局
  wuXingEnergy?: { mu, huo, tu, jin, shui, desc }; // ★ 五行能量
  fenXiTiShi: { ganHe, sanHe, liuChong, liuHe, liuHai, sanXing, ... };
  kongWang: string;       // 空亡
  shengXiao: string;      // 生肖
  taiYuan, mingGong, shenGong: Pillar; // 胎元/命宫/身宫
  liuYue?: LiuYue[];      // 流月
}

// Pillar = { gan, zhi, ganShiShen, zhiShiShen, cangGan[], nayin, diShi, ziZuo? }
// DaYunStep = { ganZhi, tianGan, diZhi, ganShiShen, zhiShiShen, startYear, endYear, liuNian[] }
```

---

### 2. 紫微斗数 `toolId = "ziwei"` **已就绪**

**入参：**
```ts
{
  name: string; gender: "男" | "女";
  year: number; month: number; day: number; hour: number;
  trueSolar?: boolean; daylightSaving?: boolean;
  runYueMode?: "as-current" | "as-next" | "mid-month";
  changShengMode?: "all-shun" | "by-year-gan" | "by-gender";
}
```

**返回：** 12宫命盘、四化飞星、星曜庙旺落陷等，使用 `@guoxue/ziwei-engine`

---

## 二、奇门遁甲

### 3. 阳盘奇门 `toolId = "qimen-yang"` **已就绪**

**入参：**
```ts
{
  datetime: string;           // 排盘时间
  method?: "zhuanpan" | "feipan";     // 默认转盘
  qiJuMethod?: "chaibu" | "maoshan" | "zhirun" | "zixuan"; // 默认拆补
  anGanMethod?: "zhishimen-qi" | "men-dipan-qi";
  feiGongMode?: "yang-shun-yin-ni" | "yinyang-jie-shun";
  customJu?: number;           // 自选局1-9
  trueSolar?: boolean;
}
```

**返回核心字段：**
```ts
{
  juNumber: number;        // 局数 1-9
  dunType: "yang" | "yin";
  jieQi: string;           // 用事节气
  yongShi: string;         // 用事时辰干支
  zhiFu: string;           // 值符
  zhiShiMen: string;       // 值使门
  gongs: QimenGong[9];     // ★ 九宫数组 [index:1坎...9离]
  dipanBashen: string[8];  // 地盘八神
}

// QimenGong = {
//   index, name(宫名), bagua, diPan(地盘干), tianPan(天盘干),
//   star(九星), men(八门), shen(八神), yinGan?,
//   isRuMu, isJiXing, isMenPo, changSheng?, kongWang, maXing,
//   shenSha?, interpretation?
// }
```

---

### 4. 阳盘命理奇门 `toolId = "qimen-yang-mingli"` **已就绪**

**入参：**
```ts
{
  birthTime: string;          // ★ 出生时间
  gender: "男" | "女";
  birthplace?: string;
  jiGongMode?: "kungong" | "yang-gen-yin-kun";
  trueSolar?: boolean;
  ziShiMode?: "traditional" | "early-late";
  daylightSaving?: boolean;
}
```

**返回核心字段：**
```ts
{
  basicInfo: { juShu, dunType, riGanZhi, shiGanZhi, gender, birthplace };
  gongs: QimenGong[9];           // ★ 增强九宫（入墓/击刑/门破/长生/解读均真实计算）
  mingLi: {
    daYun: { name, startAge, endAge, juNumber }[];
    baziSwitch: { available, baziRecordId? };
    bazi?: { nian, yue, ri, shi, shengXiao, kongWang, wuXingEnergy, nianNaYin... };
    mingGong?: { ganZhi, gan, zhi, gongIndex, gongName, star, men, shen };   // ★ 命宫落宫
    shenGong?: { ganZhi, gan, zhi, gongIndex, gongName, star, men, shen };   // ★ 身宫落宫
    qiYunInfo?: { startAge, startYear, desc };
    liuNian?: { year, ganZhi, age, luoGongIndex, luoGongName, daYunGanZhi };
    daYunSteps?: { name, ganZhi, startAge, endAge, startYear, endYear, ganShiShen?, zhiShiShen?, liuNian[] }[];
  };
  geJu: { name, active, desc, jiXiong }[];  // ★ 八字格局+奇门星门神组合
  duanYu: string;                              // ★ 综合断语
}
```

---

### 5. 阴盘奇门 `toolId = "qimen-yin"` **已就绪**

**入参：**
```ts
{
  datetime: string;
  panType?: "nian" | "ri" | "shi" | "ke";  // 默认时盘
  customJu?: number;           // 自选局
  trueSolar?: boolean;
}
```

**返回：** 结构同阳盘，增加 `yinGan` 隐干字段，九星/八门/八神逆排

---

### 6. 阴盘命理奇门 `toolId = "qimen-yin-mingli"` **已就绪**

> 独立计算器，复用阴盘排盘+八字引擎，与阳盘命理同构。

**入参：**
```ts
{
  birthTime: string; gender: "男" | "女";
  birthplace?: string;
  trueSolar?: boolean; ziShiMode?: "traditional" | "early-late";
  daylightSaving?: boolean;
}
```

**返回：** 结构同阳盘命理奇门，使用阴盘排盘算法（九星/八门/八神逆排、隐干）

---

### 7. 山向奇门 `toolId = "shanxiang-qimen"` **已就绪**

**入参：**
```ts
{
  zuoShan: string;    // 坐山，24山之一
  xiang: string;      // 朝向，24山之一
  duShu?: number;     // 度数 0-15
  year?: number;      // 用事年份
}
```

**返回：** 24山72局定位、坐山朝向吉凶分析

---

### 8. 奇门穿壬 `toolId = "qimen-chuanren"` **已就绪**

> 奇门定方+六壬定时，双层嵌套，72局完整吉凶表，六壬四课三传深度穿透至各宫位。

**入参：**
```ts
{
  datetime: string;
  method?: "zhuanpan" | "feipan";
  qiJuMethod?: "chaibu" | "maoshan" | "zhirun";
  trueSolar?: boolean;
  birthYear?: number;     // 命主出生年（六壬用）
  gender?: "男" | "女";   // 性别（六壬用）
}
```

**返回核心字段：**
```ts
{
  qimen: { juShu, dunType, jieQi, yongShi, gongs[], zhiFu, zhiShiMen };
  liuren: { zhanShi, yueJiang, dayNight, riGanZhi, gongs[], siKe[], sanChuan, keJing[], shenSha[], kongWang[], nianMing, xingNian };
  chuanren: {
    ju72Index, ju72Name, ju72JiXiong, ju72Desc;     // ★ 七十二局
    zhiFuGongName, zhiFuChuanZhi;                    // ★ 值符宫穿壬支
    mappings: [{                                       // ★ 九宫穿壬映射
      qimenGong: { index, name, star, men, shen, ... };
      liurenZhi: string[];                             // 宫→壬支
      gongChuanJiXiong: string;                        // 宫位穿壬综合吉凶
      zhiAnalysis: [{                                  // 每支穿透详情
        zhi, tianPan, tianJiang, dunGan, liuQin,
        inSiKe, inSanChuan, sanChuanPosition,
        isKongWang, shenSha[], chuanJiXiong, chuanDesc
      }];
      gongChuanDesc: string;                           // 宫位穿壬解读
    }];
  };
  duanYu: {
    summary, overallJiXiong;              // ★ 综合断语
    ju72: { name, star, men, tianJiang, jiXiong, desc };
    zhiFuAnalysis: { gongName, chuanZhi, zhiDetail[], desc };
    perPalace: [{ gongName, star, men, shen, gongJiXiong, zhiDetail[], desc }]; // ★ 逐宫分析
  };
}
```

---

## 三、六壬神课

### 9. 大六壬 `toolId = "daliuren"` **已就绪**

**入参：**
```ts
{
  datetime: string; birthYear: number; gender: "男" | "女";
  liveTime: string;
  jiangMethod?: "zhongqi" | "jiaojie";
  guiRenJue?: "jiawugeng-niuyang" | "jiayang-wugengniu";
  guiRenDayNight?: "maoyou" | "day" | "night";
  sheHaiType?: "mengzhongji" | "shenqian";
  trueSolar?: boolean;
}
```

**返回：** 天地盘、四课、三传、九宗门、十二天将、64课经

---

### 10. 小六壬 `toolId = "xiaoliuren"` **已就绪**

**入参：**
```ts
{
  datetime: string;
  type: "daojia" | "jiangshi" | "jiangshi2";
  method: "time" | "baoshu";
  reportNumber?: number;
}
```

**返回：** 大安/留连/速喜/赤口/小吉/空亡六宫掌诀

---

### 11. 金口诀 `toolId = "jinkoujue"` **已就绪**

> 四位直断，贵人诀/昼夜顺逆/五动三动/60甲子纳音/神煞/干元五合完整算法。

**入参：**
```ts
{
  datetime: string; diFen: string; diFenMethod: "select" | "baoshu" | "random";
  jiangMethod?: "zhongqi" | "jiaojie";
  guiRenJue?: "jiawugeng-niuyang" | "jiayang-wugengniu";
  guiRenDayNight?: "maoyou" | "day" | "night";
  trueSolar?: boolean;
}
```

**返回：** 人元/贵神/月将/地分四位直断

---

## 四、占卜

### 12. 六爻 `toolId = "liuyao"` **已就绪**

**入参：**
```ts
{
  method: "time" | "manual" | "shake" | "hex-name" | "number-2" | "number-3" | "auto" | "phone" | "stroke";
  datetime?: string;        // method=time时
  numbers2?: number[];      // method=number-2时 [A, B]
  numbers3?: number[];      // method=number-3时 [A, B, C]
  hexName?: string;         // method=hex-name时 卦名
  dongYaoPositions?: number[]; // 动爻位置
}
```

**返回：** 纳甲装卦、本卦/变卦/互卦、六亲、六兽、世应

---

### 13. 梅花易数 `toolId = "meihua"` **已就绪**

**入参：**
```ts
{
  method: "time" | "manual" | "number" | "auto";
  datetime?: string;
  numbers?: number[];    // 报数法
  upperGua?: number;     // 上卦 1-8（手动）
  lowerGua?: number;     // 下卦 1-8
  dongYao?: number;      // 动爻 1-6
}
```

**返回：** 本卦/变卦/互卦、体用生克、策轨元会运世

---

### 14. 小成图 `toolId = "xiaochengtu"` **已就绪**

> 霍斐然小成图，阖辟往来/归藏法九宫/正推旁推/64卦取象完整算法。

**入参：**
```ts
{
  method: "shici" | "baoshu" | "zimu" | "random";
  datetime?: string; numbers?: number[];
  chars?: string; question?: string;
}
```

---

### 15. 金钱课 `toolId = "jinqianke"` **已就绪**

**入参：**
```ts
{ method: "shoutou" | "baoshu" | "random"; datetime?: string; question?: string; }
```

**返回：** 64卦卦辞、爻辞、变卦互卦

---

### 16. 诸葛神数 `toolId = "zhugeshenshu"` **已就绪**

**入参：**
```ts
{ method: "sanzi" | "baoshu" | "random"; chars?: string; numbers?: number[]; question?: string; }
```

**返回：** 384签文、折十法推演、签诗解读

---

### 17. 孔明神卦 `toolId = "kongmingshengua"` **已就绪**

**入参：**
```ts
{ method: "shici" | "baoshu" | "random"; datetime?: string; number?: number; trigger?: string; question?: string; }
```

**返回：** 周易64卦解签

---

## 五、风水

### 18. 玄空飞星 `toolId = "xuankong-feixing"` **已就绪**

**入参：**
```ts
{
  shan: string;     // 坐山 24山
  xiang: string;    // 朝向 24山
  year: number;     // 建造年份
  yuanYun?: number; // 元运 1-9
  tiGua?: boolean;  // 替卦
}
```

**返回：** 运盘/山盘/向盘/飞星/组合分析/格局

---

### 19. 八宅风水 `toolId = "bazhai"` **已就绪**

**入参：**
```ts
{
  birthYear: number; gender: "男" | "女";
  zuoShan: "坎" | "坤" | "震" | "巽" | "乾" | "兑" | "艮" | "离";
  liuNian?: boolean; liuNianYear?: number;
}
```

**返回：** 命卦/东西四宅/八方吉凶/大游年

---

### 20. 电子罗盘 `toolId = "dianzi-luopan"` **已就绪**

**入参：**
```ts
{
  type: "sanhe" | "sanyuan" | "zonghe";
  degree?: number;
  magneticCorrection?: boolean;
  longitude?: number; latitude?: number;
  buildYear?: number;
}
```

**返回：** 24山方位、纳甲、三合水口、罗盘分层数据

---

### 21. 立极尺 `toolId = "liji-chi"` **已就绪**

**入参：**
```ts
{ chiType: "luban" | "dinglan" | "mengong" | "yacun"; lengthCm: number; usage?: string; batch?: boolean; }
```

**返回：** 四尺吉利尺寸/压白/门公尺推算

---

### 22. 山向地图 `toolId = "shanxiang-ditu"` **已就绪**

**入参：**
```ts
{
  longitude: number; latitude: number; direction: number;
  zoom?: number; showShanOverlay?: boolean; showJiuGong?: boolean; buildYear?: number;
}
```

> 工具需要地图SDK支持，后端提供山向计算+图层数据

---

## 六、星命

### 23. 太乙神数 `toolId = "taiyi"` **已就绪**

**入参：**
```ts
{ datetime: string; shiType: "年计" | "月计" | "日计" | "时计"; yangDun?: boolean; }
```

**返回：** 五元六纪、十六神盘、三算八将

---

### 24. 七政四余 `toolId = "qizheng-siyu"` **已就绪**

**入参：**
```ts
{
  datetime: string; gender: "男" | "女";
  longitude?: number; latitude?: number;
  trueSolar?: boolean;
  system?: "guolao" | "dongwei";
}
```

**返回：** 十一曜/二十八宿/命宫十二宫/洞微大限

---

### 25. 五运六气 `toolId = "wuyun-liuqi"` **已就绪**

**入参：**
```ts
{ year: number; showProcess?: boolean; currentDate?: string; }
```

**返回：** 天干化运/地支化气/司天在泉/病候养生

---

## 七、起名

### 26. 起名工具 `toolId = "qiming"` **已就绪**

**入参：**
```ts
{
  surname: string; gender: "男" | "女"; datetime: string;
  mode?: "auto" | "manual" | "fix";
  methods?: string[];       // 多选：wuge/bazi-yongshen/shengxiao/yinyang-wuxing/zhouyi-gua/yinyun/ziyi/sancai/shici/kangxi/liushu
  nameLength?: 1 | 2;
  style?: "古典" | "现代" | "诗词" | "国学";
  count?: number;
}
```

**返回：** 多流派起名方案

---

### 27. 姓名解析 `toolId = "xingming-jiexi"` **已就绪**

> 五格数理姓名学，600+康熙笔画表、完整81数理吉凶、三才配置。

**入参：**
```ts
{ surname: string; givenName: string; kangXiStrokes?: boolean; gender?: "男" | "女"; }
```

**返回：** 天/人/地/总/外格、三才配置、81数理吉凶

---

## 八、工具字典

### 28. 飞宫小奇门 `toolId = "feigong-xiaoqimen"` **已就绪**

**入参：**
```ts
{ method: "shichen" | "baoshu" | "random"; datetime?: string; number?: number; question?: string; }
```

**返回：** 九宫飞布、星门组合

---

### 29. 手机号分析 `toolId = "shoujihao-fenxi"` **已就绪**

**入参：**
```ts
{
  phone: string;
  system?: "energy" | "wuxing" | "bagua" | "all";
  birthday?: string; // 生辰（选填，匹配度分析用）
  gender?: "男" | "女";
}
```

**返回：** 八星磁场、81数理、阴阳五行、靓号识别

---

### 30. 万年历·择吉 `toolId = "wannianli"` **已就绪**

**入参：**
```ts
{
  date: string;           // 查询日期
  rangeType?: "day" | "month" | "range";
  endDate?: string;
  shiXiang?: string[];    // 择吉事项
  zeJiMethods?: string[]; // 择吉方法
  bazi?: string;          // 个人八字
}
```

**返回：** 黄历宜忌、建除、二十八宿、神煞、节气

---

### 31. 康熙字典 `toolId = "kangxi-zidian"` **已就绪**

**入参：**
```ts
{
  queryType: "char" | "pinyin" | "radical" | "stroke" | "wuxing";
  query: string;
  wuXingFilter?: "金" | "木" | "水" | "火" | "土";
  strokeMin?: number; strokeMax?: number;
}
```

> 查询端点可能为 `POST /api/v1/tools/kangxi-zidian/search`

---

### 32. 汉字筛选 `toolId = "hanzi-shaixuan"` **已就绪**

**入参：**
```ts
{
  wuXing?: "金" | "木" | "水" | "火" | "土";
  strokeMin?: number; strokeMax?: number;
  radical?: string; tone?: number[];
  meaningKeyword?: string;
  commonOnly?: boolean; nameOnly?: boolean;
  zodiac?: string; sortBy?: "stroke" | "pinyin" | "frequency" | "wuxing";
}
```

> 查询端点可能为 `POST /api/v1/tools/hanzi-shaixuan/search`

---

## 调用示例

```ts
// 八字排盘
const res = await fetch('/api/v1/tools/bazi/calculate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: "张三", gender: "男",
    year: 1984, month: 3, day: 15, hour: 8, minute: 30,
    city: "北京"
  })
}).then(r => r.json());
// res = { code: 200, data: { toolId, result, durationMs }, message: "ok" }

const baziData = res.data.result;  // 排盘数据在 data.result
console.log(baziData.siZhu);       // 四柱
console.log(baziData.geJu);        // 格局
console.log(baziData.qiYun);       // 大运
```

---

## 状态总览

| 状态 | 数量 | 工具 |
|------|------|------|
| **已就绪** | 32 | 全部工具算法完整，可直接对接生产 |

> 所有工具 `/calculate` 端点均返回真实排盘数据。2026-05-19 完成最后 5 个占位计算器升级。

## 注意

1. **数据在 `.data.result` 里**：API 返回 `{ code, data: { toolId, result, durationMs }, message }`，排盘数据从 `res.data.result` 取
2. **宫位索引**：奇门 `gongs` 数组为 `[坎1, 坤2, 震3, 巽4, 中5, 乾6, 兑7, 艮8, 离9]`
3. **时间格式**：一律 ISO 8601 `"2026-05-19T14:30:00+08:00"`
4. **toolId 精确匹配**：前端路由 `/tools/<route>`，API 调用 `/tools/<toolId>/calculate`，两者可能不同（如路由 `/tools/shoujihao-fenxi`，toolId `shoujihao-fenxi`）

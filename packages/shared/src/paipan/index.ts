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
export * from "./meihua-engine"
export * from "./meihua-data"
// 小六壬：2026-09-18 从前端迁入，前后端共用同一份算法（缘由见该文件顶部）
export * from "./xiaoliuren-engine";
// 玄空：迁的是前端那份（正确的）；后端旧 calculator 顺逆判错，已作废
export * from "./xuankong-engine";
// 阴盘奇门定局：按月亮走（年月日时取数除九），与阳盘的节气拆补完全两回事
export * from "./yinpan-qimen";
// 金口诀：迁的是前端那份（经竞品基准校准）；后端旧 calculator 月将算错已删除
export * from "./jinkoujue-engine";
// 罗盘圈层数据层：各盘制的圈层定义与读盘。前后端单一来源——
// 此前两边各自散落圈层数组，格数与起算点对不上（详见该文件头部注释）。
export * from "./luopan-rings";
// 山向地图：太极点 → 周边标注的方位/距离/山位/煞忌。不依赖任何地图服务，换底图不改算法。
export * from "./shanxiang-map";
// 五格剖象：三份各错各的实现合一（人格≡总格、外格≡1 是原实现的硬矛盾，见该文件头部）
export * from "./wuge";
// 康熙笔画表（20992 条，自前端迁入）。后端原表 36% 常用姓名用字走「码点算笔画」兜底，见该文件头部。
export * from "./kangxi";
// 起名字库底池：《通用规范汉字表》一级 3500 字 ×（康熙笔画/五行/部首/拼音声调）。
// 原前端 CHAR_POOL 仅 159 字、过滤后有效池 9–26 个，是重名的根源之一。
export * from "./naming-pool";
// 起名候选生成：先筛合格再按种子抽样。重名的另一半成因是「打分确定性」——
// 原实现按总分降序取前 N，同输入恒得同一批名字，字库再大也没用。
export * from "./naming-engine";
// 典籍用字：楚辞＋唐诗＋宋词 40076 篇统计出的字频与出处，用作适名字表的依据。
// 在典籍里反复出现的字本就是历代文人选过一遍的，且顺带解决「诗词出处」字段。
export * from "./dianji";
// 起名宜忌审定：人工判断层。判据逐条写在常量里，可复核可推翻。
export * from "./naming-review";
// 企业名称核名预检：依《企业名称登记管理规定》编码禁限用规则。
// 只排除必然驳回者，**不含同行业查重**（需工商数据），定位是预检不是担保。
export * from "./company-name-check";

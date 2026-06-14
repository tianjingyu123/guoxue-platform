// 算法参考：《阳宅十书》《八宅明镜》《阳宅三要》
import type { ZhaixiangFengshuiResult, XingShaItem } from "@guoxue/shared"

const XING_SHA: XingShaItem[] = [
  // ═══════════ 外煞（外部形煞）═══════════
  { name: "路冲煞", alias: ["枪煞", "箭煞"], type: "外煞", wuXing: "土", position: "大门正对直路", severity: "大凶", shape: "道路直冲大门，如枪如箭", effect: "血光之灾、意外横祸、家宅不宁", resolve: ["设影壁或屏风遮挡", "门口摆放石狮或八卦镜", "种植高大绿植缓冲"], source: "《阳宅十书·路冲篇》" },
  { name: "反弓煞", alias: ["镰刀煞", "反弓路"], type: "外煞", wuXing: "金", position: "道路呈弧形向外弯曲", severity: "大凶", shape: "道路如弯弓向外，宅在弓背", effect: "破财败业、婚姻离散、多病多灾", resolve: ["门向改朝弓内方向", "门口放置泰山石敢当", "种植茂密树墙遮挡"], source: "《阳宅十书·形煞篇》" },
  { name: "天斩煞", alias: ["天堑煞", "刀劈煞"], type: "外煞", wuXing: "金", position: "两高楼夹缝正对门窗", severity: "大凶", shape: "两栋高楼之间的狭窄缝隙", effect: "血光手术、意外伤害、事业中断", resolve: ["窗挂厚重窗帘", "摆放阔叶植物遮挡", "悬挂八卦凸镜"], source: "《阳宅十书·外煞》" },
  { name: "壁刀煞", alias: ["飞刃煞", "切角煞"], type: "外煞", wuXing: "金", position: "邻楼墙壁边角正对", severity: "凶", shape: "相邻建筑的墙壁边缘如刀切来", effect: "意外刀伤、手术、口舌是非", resolve: ["窗外挂风铃化煞", "种植爬藤植物", "安装百叶窗改变角度"], source: "《阳宅十书》" },
  { name: "尖角煞", alias: ["火形煞", "尖射煞"], type: "外煞", wuXing: "火", position: "屋角/塔尖/烟囱正对", severity: "凶", shape: "尖锐物体直指门窗", effect: "火灾、眼疾、暴躁易怒、心血管病", resolve: ["悬挂圆形装饰化解", "摆放水景或鱼缸", "安装圆形窗户"], source: "《阳宅十书·尖角篇》" },
  { name: "探头煞", alias: ["探頭煞", "探头屋"], type: "外煞", wuXing: "土", position: "邻屋高出本宅且露角", severity: "中", shape: "邻居房屋高出己宅且有突起", effect: "遭小人暗算、盗窃、隐私泄露", resolve: ["加高自家围墙", "屋顶设避煞物", "种植高大树篱"], source: "《阳宅十书》" },
  { name: "牵鼻煞", alias: ["牵牛煞", "穿鼻煞"], type: "外煞", wuXing: "金", position: "门口正对向下楼梯/扶梯", severity: "凶", shape: "楼梯如牛绳直拉门口", effect: "财气外泄、家运下滑、事业不顺", resolve: ["门口设门槛增高", "门内设玄关遮挡", "门楣挂五帝钱"], source: "《阳宅十书·门路篇》" },
  { name: "穿堂煞", alias: ["穿心煞", "一通到底"], type: "内煞", wuXing: "木", position: "大门直通后门/阳台", severity: "凶", shape: "大门与后门或阳台成一直线", effect: "财来财去、不聚财、家人不和", resolve: ["设玄关或屏风隔断", "中间摆放高大柜体", "挂门帘阻隔"], source: "《阳宅十书·穿堂篇》" },
  { name: "天压煞", alias: ["横梁压顶", "梁压煞"], type: "内煞", wuXing: "土", position: "坐卧处上有横梁", severity: "凶", shape: "横梁压在床、沙发、办公桌上方", effect: "压力大、头痛、事业受阻、睡眠差", resolve: ["移位避开横梁", "做吊顶包覆横梁", "梁下挂葫芦化解"], source: "《阳宅十书》" },
  { name: "门冲煞", alias: ["对门煞", "朱雀开口"], type: "内煞", wuXing: "木", position: "两门相对", severity: "中", shape: "房门与房门或大门与房门正对", effect: "口舌是非、家人争吵、隐私暴露", resolve: ["两门之间挂门帘", "门上加装门坎", "常关其中一扇"], source: "《阳宅十书·门篇》" },
  { name: "厕中煞", alias: ["秽气煞", "污秽煞"], type: "内煞", wuXing: "水", position: "厕所居中宫或对大门", severity: "凶", shape: "厕所位于房屋中心或正对大门", effect: "财运衰败、健康受损、贵人远离", resolve: ["厕所常关门加盖", "放置粗盐或活性炭", "厕所内放绿植净化"], source: "《阳宅十书》" },
  { name: "光煞", alias: ["反光煞", "镜面煞"], type: "外煞", wuXing: "火", position: "对面玻璃幕墙反光", severity: "中", shape: "对面建筑玻璃幕墙反光照射", effect: "眼疾、注意力不集中、情绪烦躁", resolve: ["安装遮光窗帘", "窗贴磨砂膜", "窗台放绿植遮挡"], source: "《现代风水学》" },
  { name: "声煞", alias: ["噪音煞", "喧嚣煞"], type: "外煞", wuXing: "金", position: "靠近马路/工厂/市场", severity: "中", shape: "长期受噪音干扰", effect: "耳鸣失眠、精神紧张、工作效率低", resolve: ["安装隔音窗", "室内播放轻音乐", "种植隔音绿篱"], source: "《现代风水学》" },
  { name: "味煞", alias: ["臭气煞", "异味煞"], type: "外煞", wuXing: "土", position: "靠近垃圾站/臭水沟", severity: "小凶", shape: "长期有异味飘入", effect: "呼吸道疾病、胃口差、运势低迷", resolve: ["关闭异味来源侧门窗", "使用空气净化器", "放置活性炭除味"], source: "《现代风水学》" },
  { name: "白虎煞", alias: ["白虎抬头", "右强煞"], type: "外煞", wuXing: "金", position: "右方建筑高于左方", severity: "凶", shape: "住宅右边（白虎方）建筑高于左边", effect: "女人强势、家庭不和、小人是非", resolve: ["左方加高建筑或植树", "左方挂青龙饰物", "右方放金属物件平衡"], source: "《阳宅十书·四象篇》" },
  { name: "孤阳煞", alias: ["孤峰煞", "高处煞"], type: "外煞", wuXing: "火", position: "独栋高楼或周边无靠", severity: "中", shape: "住宅孤高，四周没有依靠", effect: "孤独无依、人缘差、财运不聚", resolve: ["室内多设圆角装饰", "增加水系元素", "保持社区联系"], source: "《阳宅十书》" },
  { name: "独阴煞", alias: ["阴气煞", "孤阴煞"], type: "外煞", wuXing: "水", position: "靠近坟墓/医院/殡仪馆", severity: "凶", shape: "邻近阴气重的场所", effect: "精神抑郁、身体虚弱、运势低落", resolve: ["多开窗采光通风", "室内保持明亮温暖", "养阳气旺的植物"], source: "《阳宅十书》" },
  { name: "蜈蚣煞", alias: ["蜈蚣形煞", "管线煞"], type: "外煞", wuXing: "火", position: "外墙多管道像蜈蚣", severity: "中", shape: "外墙布满排水管/燃气管如蜈蚣", effect: "肠胃病、口舌是非、工作不顺", resolve: ["管道涂与墙壁相同颜色", "种植藤蔓遮挡管道", "放置铜公鸡化解"], source: "《阳宅风水形煞》" },
  { name: "顶心煞", alias: ["顶针煞", "柱冲煞"], type: "外煞", wuXing: "木", position: "门口正对柱子/电线杆", severity: "凶", shape: "门前有柱子或电线杆挡住", effect: "事业受阻、前途受阻、眼疾头痛", resolve: ["改门向避开", "柱上缠绕绿植", "门口放八卦镜"], source: "《阳宅十书》" },
  { name: "剪刀煞", alias: ["交叉煞", "Y形煞"], type: "外煞", wuXing: "金", position: "两路交叉夹住房宅", severity: "大凶", shape: "两条路形成V字形夹住房宅", effect: "破财、官司、意外伤害、婚姻破裂", resolve: ["门前设照壁", "路口植树墙遮挡", "布置水景缓冲"], source: "《阳宅十书》" },
  { name: "割脚煞", alias: ["水割煞", "割脚水"], type: "外煞", wuXing: "水", position: "住宅太靠近水边", severity: "中", shape: "住宅离水边太近，地基受水冲刷", effect: "财运不稳、时好时坏、根基不牢", resolve: ["加固地基防水", "水边种植护坡植物", "室内多用土元素平衡"], source: "《阳宅十书》" },
  { name: "镰刀回勾", alias: ["内弓煞", "玉带水破"], type: "外煞", wuXing: "水", position: "河流内侧弯道过急", severity: "中", shape: "河道急弯内侧水冲刷", effect: "先发财后破败、大起大落", resolve: ["河岸加固护坡", "院内设水池稳定水气", "放置石敢当"], source: "《地理五诀》" },
  { name: "天秤煞", alias: ["吊臂煞", "起重机煞"], type: "外煞", wuXing: "金", position: "窗外有塔吊/起重机", severity: "中", shape: "窗外可见施工塔吊", effect: "意外伤害、事业中断、家人不和", resolve: ["窗挂铜铃化解金气", "临时搬离面对房间", "悬挂黄色窗帘"], source: "《现代风水学》" },
  { name: "烟囱煞", alias: ["烟突煞", "黑烟煞"], type: "外煞", wuXing: "火", position: "窗外有烟囱", severity: "中", shape: "窗外可见烟囱喷烟", effect: "呼吸系统疾病、事业不顺、心情压抑", resolve: ["关闭面对烟囱的窗户", "安装空气净化器", "窗台放绿色植物"], source: "《现代风水学》" },
  { name: "招牌煞", alias: ["广告牌煞", "压顶招牌"], type: "外煞", wuXing: "土", position: "大型招牌正对门窗", severity: "小凶", shape: "对面建筑大型招牌直射", effect: "精神紧张、注意力分散、睡眠差", resolve: ["安装遮光窗帘", "改变房间用途", "放置水晶化解"], source: "《现代风水学》" },
  { name: "天罗煞", alias: ["电线煞", "蛛网煞"], type: "外煞", wuXing: "火", position: "上空有密集电线", severity: "中", shape: "住宅上空电线密布如网", effect: "思维混乱、决策失误、事业发展受阻", resolve: ["尽量改线或地埋", "屋顶设金属网屏蔽", "室内增加绿植"], source: "《现代风水学》" },
  // ═══════════ 内煞（内部形煞）═══════════
  { name: "穿心煞", alias: ["中宫煞", "一箭穿心"], type: "内煞", wuXing: "土", position: "楼梯/走廊贯穿房屋正中", severity: "大凶", shape: "室内楼梯或长走廊贯穿中央", effect: "心脏疾病、家庭不和、事业衰败", resolve: ["走廊尽头设端景", "走廊挂画或镜子", "中宫位置放重物稳定"], source: "《阳宅十书》" },
  { name: "门门相对", alias: ["三门相通", "串门煞"], type: "内煞", wuXing: "木", position: "多扇门成一直线", severity: "中", shape: "三扇以上门在一条直线上", effect: "口舌是非多、家庭关系紧张", resolve: ["保持部分门关闭", "门之间设屏风", "改变其中一扇门的位置"], source: "《阳宅十书》" },
  { name: "厨厕相邻", alias: ["水火对冲", "厨厕同宫"], type: "内煞", wuXing: "水", position: "厨房与厕所相邻或相对", severity: "凶", shape: "厨房火气与厕所水污气相邻", effect: "肠胃疾病、财运衰败、食物中毒", resolve: ["两室之间加厚隔断", "厨房门常闭", "厕所放盐净化"], source: "《阳宅十书》" },
  { name: "卧房见灶", alias: ["火气入房", "烤房煞"], type: "内煞", wuXing: "火", position: "卧室紧邻厨房灶位", severity: "凶", shape: "卧室与灶台仅一墙之隔", effect: "脾气暴躁、失眠多梦、皮肤问题", resolve: ["床头避开灶墙", "墙面加隔热层", "卧室用冷色调"], source: "《阳宅十书》" },
  { name: "镜照床", alias: ["镜煞", "摄魂煞"], type: "内煞", wuXing: "金", position: "镜子正对床铺", severity: "中", shape: "床铺被镜子直接照到", effect: "失眠多梦、神经衰弱、夫妻不和", resolve: ["夜间遮盖镜面", "镜面不朝床摆放", "用衣柜内置镜代替"], source: "《阳宅十书》" },
  { name: "床下杂物", alias: ["积秽煞", "床底煞"], type: "内煞", wuXing: "土", position: "床下堆放杂物", severity: "小凶", shape: "床底堆放旧物杂物", effect: "睡眠质量差、运势受阻、健康下滑", resolve: ["床下保持空净", "定期清理", "床下放天然矿石净化"], source: "《阳宅十书》" },
  { name: "鱼缸错位", alias: ["水煞", "乱水煞"], type: "内煞", wuXing: "水", position: "鱼缸放在错误位置", severity: "中", shape: "鱼缸放在凶位或忌水处", effect: "财运反泄、事业波动、情感不稳", resolve: ["鱼缸放在吉位", "财位放鱼缸最旺", "卧室不放鱼缸"], source: "《阳宅水法》" },
  { name: "床头悬空", alias: ["无靠煞", "悬空煞"], type: "内煞", wuXing: "土", position: "床头不靠实墙", severity: "中", shape: "床头悬空或靠窗", effect: "事业无靠山、贵人远离、睡眠差", resolve: ["床头靠实墙", "无法靠墙则加高床头板", "放靠山石"], source: "《阳宅十书》" },
  { name: "厨在西北", alias: ["火烧天门", "乾宫火煞"], type: "内煞", wuXing: "火", position: "厨房位于西北乾位", severity: "大凶", shape: "厨房在住宅西北角", effect: "男主人运势严重受损、事业衰败、健康恶化", resolve: ["厨房移位（最好方案）", "厨房多用黄色化解", "放金属器皿克制"], source: "《阳宅十书》" },
  { name: "厕在西北", alias: ["水淹天门", "乾宫水煞"], type: "内煞", wuXing: "水", position: "厕所位于西北乾位", severity: "大凶", shape: "厕所（水）克西北（金）", effect: "男主人健康大损、事业一落千丈", resolve: ["厕所移位（最好方案）", "厕所常关门加盖", "西北位放金属摆件"], source: "《阳宅十书》" },
  { name: "明财位受压", alias: ["财位煞", "压财煞"], type: "内煞", wuXing: "土", position: "财位放置重物", severity: "凶", shape: "大门斜对角财位放重物/空调/垃圾桶", effect: "财运不畅、赚钱辛苦、存不住钱", resolve: ["财位清空放净", "财位放招财摆件", "财位保持明亮"], source: "《阳宅财位法》" },
  { name: "神位不当", alias: ["神像煞", "供神不敬"], type: "内煞", wuXing: "火", position: "神位位置不当", severity: "凶", shape: "神位面对厕所/卧室/楼梯", effect: "家运衰败、事事不顺、家人多病", resolve: ["神位对着干净墙壁", "神位背靠实墙", "神位上方不可有梁"], source: "《阳宅十书》" },
  { name: "开门见灶", alias: ["灶火迎门", "火气冲门"], type: "内煞", wuXing: "火", position: "大门打开即见厨房", severity: "凶", shape: "大门一开直接看到厨房灶台", effect: "财气被火烧散、多耗财、脾胃病", resolve: ["厨房设门常关", "入口设屏风隔断", "灶位改向不外露"], source: "《阳宅十书》" },
  { name: "开门见厕", alias: ["秽气迎门", "晦气迎门"], type: "内煞", wuXing: "水", position: "大门打开即见厕所", severity: "大凶", shape: "入门直接面对厕所门", effect: "财运衰败、贵人远离、健康受损", resolve: ["厕所门改向", "入口设玄关遮挡", "厕所门常关", "门挂长帘"], source: "《阳宅十书》" },
  { name: "开门见镜", alias: ["镜迎门煞", "摄气煞"], type: "内煞", wuXing: "金", position: "大门打开即见镜子", severity: "中", shape: "玄关或门厅设大镜子正对门", effect: "财气被反射外泄、贵人不进门", resolve: ["镜子移位到侧面", "加镜帘或遮盖", "改用小圆镜"], source: "《阳宅十书》" },
  { name: "卧房过大", alias: ["散气煞", "大房煞"], type: "内煞", wuXing: "木", position: "主卧面积过大", severity: "小凶", shape: "主卧超过20平", effect: "气散不聚、睡眠差、夫妻感情淡", resolve: ["卧室内设衣帽间分隔", "床加帐幔聚气", "室内多用暖色调"], source: "《阳宅十书》" },
  { name: "顶灯压床", alias: ["灯压煞", "吊灯煞"], type: "内煞", wuXing: "火", position: "吊灯或吸顶灯正对床", severity: "中", shape: "大吊灯或尖角灯直接悬在床正上方", effect: "失眠不安、头痛目眩、精神压力", resolve: ["灯具移位偏离床", "换平顶吸顶灯", "床移位避开"], source: "《现代风水学》" },
  { name: "桃花位乱", alias: ["桃花煞", "烂桃花煞"], type: "内煞", wuXing: "水", position: "桃花位布置不当", severity: "中", shape: "桃花位放杂物/厕所/厨房", effect: "感情混乱、烂桃花、婚外情", resolve: ["桃花位保持整洁", "放鲜花旺正缘", "避免放杂物水缸"], source: "《阳宅桃花法》" },
  { name: "横梁压灶", alias: ["灶压煞", "梁压灶台"], type: "内煞", wuXing: "土", position: "灶台上方有横梁", severity: "凶", shape: "灶台上方横梁压住", effect: "家运受压、女主人健康受损、财运差", resolve: ["灶位移出梁下", "梁做吊顶包覆", "梁下挂葫芦"], source: "《阳宅十书》" },
  { name: "睡床对门", alias: ["冲床煞", "门冲床"], type: "内煞", wuXing: "木", position: "床正对房门", severity: "中", shape: "床铺直接面对卧室门", effect: "睡眠不安、易受惊吓、健康受损", resolve: ["床移位不朝门", "加床幔遮挡", "门挂风铃或门帘"], source: "《阳宅十书》" },
  { name: "楼梯压床", alias: ["梯压煞", "踏头煞"], type: "内煞", wuXing: "土", position: "床上方即楼梯", severity: "大凶", shape: "卧室上方为楼梯或楼梯转角", effect: "严重头痛、精神疾病、事业大挫", resolve: ["卧室移位（最好方案）", "天花板做隔音隔层", "床避开楼梯正下方"], source: "《阳宅十书》" },
  { name: "厕所对床", alias: ["厕冲床", "秽冲床"], type: "内煞", wuXing: "水", position: "卧室厕所门对床", severity: "凶", shape: "套房厕所门直接面对床铺", effect: "肾脏疾病、财运流失、睡眠差", resolve: ["厕所门常关", "加门帘遮挡", "厕所内放绿植"], source: "《阳宅十书》" },
  { name: "屋角煞", alias: ["内尖角煞", "飞角煞"], type: "内煞", wuXing: "火", position: "室内有尖角对冲", severity: "中", shape: "室内柱子或墙角尖角对向坐卧处", effect: "头痛、争吵、意外伤害", resolve: ["尖角做圆弧处理", "尖角处放绿植", "挂圆形装饰化解"], source: "《阳宅十书》" },
  { name: "暗房煞", alias: ["无光煞", "阴室煞"], type: "内煞", wuXing: "水", position: "房间无窗无自然光", severity: "中", shape: "卧房或常用房间没有窗户", effect: "精神抑郁、运势低迷、健康恶化", resolve: ["增加人工照明", "使用暖色系灯光", "开天窗或增加窗户"], source: "《阳宅十书》" },
  { name: "五黄位动", alias: ["五黄煞", "戊己煞"], type: "内煞", wuXing: "土", position: "五黄位摆放动象物品", severity: "大凶", shape: "流年五黄位放电视/音响/风扇等", effect: "严重疾病、意外、破大财", resolve: ["五黄位保持安静", "放铜铃或六帝钱化解", "不放置电器"], source: "《玄空风水》" },
  { name: "空调压门", alias: ["风口煞", "贯门风"], type: "内煞", wuXing: "金", position: "空调出风口正对门", severity: "小凶", shape: "空调正对大门或房门吹", effect: "财气被风吹散、感冒频繁、人气不稳", resolve: ["调整空调出风方向", "加装挡风板", "门厅设屏风"], source: "《现代风水学》" },
]

export function calculateZhaixiangFengshui(input: {
  keyword?: string
  type?: "外煞" | "内煞" | "全部"
}): ZhaixiangFengshuiResult {
  let result = XING_SHA

  if (input.type && input.type !== "全部") {
    result = result.filter(s => s.type === input.type)
  }
  if (input.keyword) {
    const kw = input.keyword
    result = result.filter(s =>
      s.name.includes(kw) || s.alias.some(a => a.includes(kw))
    )
  }

  // 分类统计
  const waiSha = XING_SHA.filter(s => s.type === "外煞")
  const neiSha = XING_SHA.filter(s => s.type === "内煞")
  const daXiong = XING_SHA.filter(s => s.severity === "大凶").length
  const xiong = XING_SHA.filter(s => s.severity === "凶").length
  const zhong = XING_SHA.filter(s => s.severity === "中").length
  const xiaoXiong = XING_SHA.filter(s => s.severity === "小凶").length

  // 五行分布
  const wxCount: Record<string, number> = {}
  for (const s of XING_SHA) { wxCount[s.wuXing] = (wxCount[s.wuXing] || 0) + 1 }
  const wxStr = Object.entries(wxCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}${v}`).join("·")

  const summary = result.length >= XING_SHA.length
    ? [
        `┌─ 阳宅形煞总览 ─────────────────`,
        `│ 共收录${XING_SHA.length}种形煞，源自《阳宅十书》及现代风水学：`,
        `│ · 外煞（外部形煞）：${waiSha.length}种 — 道路/建筑/环境之煞`,
        `│ · 内煞（内部形煞）：${neiSha.length}种 — 布局/格局/室内之煞`,
        ``,
        `├─ 凶度分布 ─────────────────`,
        `│ ☠ 大凶：${daXiong}种  ⚠ 凶：${xiong}种  · 中：${zhong}种  小凶：${xiaoXiong}种`,
        ``,
        `├─ 五行分布 ─────────────────`,
        `│ ${wxStr}`,
        ``,
        `├─ 每形煞含 ─────────────────`,
        `│ 别名·类型·五行·位置·形态·影响·化解法·出处`,
        ``,
        `├─ 古籍出处 ─────────────────`,
        `│ 《阳宅十书》：明·王君荣，阳宅风水集大成之作`,
        `│ 《八宅明镜》：清·箬冠道人，八宅派经典`,
        `│ 《阳宅三要》：门主灶三要论阳宅吉凶`,
        ``,
        `└─ 用法提示 ─────────────────`,
        `   可通过 type 筛外煞/内煞，通过 keyword 搜索形煞名或别名。`,
        `   形煞化解须结合实际环境勘察，不可生搬硬套。`,
      ].join("\n")
    : [
        `┌─ 阳宅形煞：${input.type || "搜索"} ─────────────────`,
        `│ 筛选出${result.length}种形煞`,
        ...result.slice(0, 5).map(s => `│ ${s.severity === "大凶" ? "☠" : s.severity === "凶" ? "⚠" : "·"} ${s.name}（${s.wuXing}·${s.type}）：${s.effect.slice(0, 30)}...`),
        result.length > 5 ? `│ ... 还有${result.length - 5}种形煞未显示` : "",
        `│`,
        `└─ 共${result.length}条结果，请缩小筛选范围查看详情。`,
      ].filter(Boolean).join("\n")

  return { xingSha: result, total: result.length, summary }
}

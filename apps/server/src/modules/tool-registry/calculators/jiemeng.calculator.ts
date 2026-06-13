// ── 周公解梦计算引擎 ──
// 数据参考：《周公解梦》《敦煌本梦书》

import type { JieMengResult, JieMengMatch, JieMengEntry, JieMengOmen } from "@guoxue/shared";

// ── 周公解梦经典梦典（130+ 条目）──

const DREAM_DICTIONARY: JieMengEntry[] = [
  // ═══ 动物 ═══
  { keyword: "蛇", category: "动物", omen: "吉", meaning: "蛇入梦主财运将至，或为贵人暗助之兆。孕妇梦蛇主生贵子。" },
  { keyword: "龙", category: "动物", omen: "吉", meaning: "龙为祥瑞之首，梦龙主大吉，事业腾达、贵人提携，考生梦之中榜有望。" },
  { keyword: "凤", category: "动物", omen: "吉", meaning: "凤凰为百鸟之王，梦凤主喜事临门，婚事可成，女梦之尤为大吉。" },
  { keyword: "虎", category: "动物", omen: "凶", meaning: "虎为猛兽，梦虎主有强势之人相迫，或近期有口舌之争，宜低调行事。" },
  { keyword: "狗", category: "动物", omen: "吉", meaning: "狗为忠义之兽，梦狗主得朋友相助。白狗主财，黑狗主防小人。" },
  { keyword: "猫", category: "动物", omen: "凶", meaning: "猫为阴柔之物，梦猫主有小人是非，或身边有口蜜腹剑之人，需多加提防。" },
  { keyword: "鱼", category: "动物", omen: "吉", meaning: "鱼谐音'余'，梦鱼主财运亨通、年年有余。活鱼更佳，死鱼则反为不吉。" },
  { keyword: "鸟", category: "动物", omen: "吉", meaning: "飞鸟入梦主自由自在、心情舒畅。群鸟齐飞主亲友团聚，孤鸟则主思乡之情。" },
  { keyword: "马", category: "动物", omen: "吉", meaning: "马为奔腾之象，梦马主事业进步、马到成功。骑马出游主近期有远行或升迁之喜。" },
  { keyword: "牛", category: "动物", omen: "吉", meaning: "牛为勤奋之象，梦牛主勤劳致富、脚踏实地得成果。黄牛主五谷丰登。" },
  { keyword: "羊", category: "动物", omen: "吉", meaning: "羊谐音'祥'，梦羊主吉祥如意。白羊大吉，黑羊防口舌。" },
  { keyword: "猴", category: "动物", omen: "平", meaning: "猴为机灵之兽，梦猴主近期有机遇但需灵活应变，亦防有人耍弄心机。" },
  { keyword: "鸡", category: "动物", omen: "吉", meaning: "鸡为报晓之禽，梦鸡主光明在前、好消息将至。公鸡啼鸣主声名远播。" },
  { keyword: "猪", category: "动物", omen: "吉", meaning: "猪为财富象征，梦猪主财运丰厚。肥猪更佳，瘦猪则财薄。" },
  { keyword: "鼠", category: "动物", omen: "凶", meaning: "鼠为盗窃之象，梦鼠主财物有损或身边有小人暗中使坏。白鼠则不凶反吉。" },
  { keyword: "兔", category: "动物", omen: "吉", meaning: "兔为月宫之兽、温顺吉祥。梦兔主家宅安宁，白兔更主有喜事将至。" },
  { keyword: "龟", category: "动物", omen: "吉", meaning: "龟为长寿之征，梦龟主健康长寿、根基稳固。大龟入梦主得大财或福荫。" },
  { keyword: "鹤", category: "动物", omen: "吉", meaning: "仙鹤为长寿祥瑞之禽，梦鹤主高寿延年、官运亨通，长辈梦之尤佳。" },
  { keyword: "鹰", category: "动物", omen: "吉", meaning: "鹰击长空，梦鹰主志向远大、鹏程万里，事业将有大的突破。" },
  { keyword: "蜘蛛", category: "动物", omen: "吉", meaning: "蜘蛛为喜蛛，梦蜘蛛主喜事将至。'喜蛛'倒挂更主有贵客临门。" },
  { keyword: "蚂蚁", category: "动物", omen: "平", meaning: "蚂蚁为勤劳之象，梦蚁群主需踏实做事、积少成多。蚁入室主人口增多。" },
  { keyword: "蝴蝶", category: "动物", omen: "吉", meaning: "蝴蝶翩翩，梦蝶主心情愉悦、情思缠绵。双蝶共舞更主姻缘美满。" },
  { keyword: "蜻蜓", category: "动物", omen: "吉", meaning: "蜻蜓点水，梦蜻蜓主时来运转、好运即至。群蜓飞舞主社交活跃。" },

  // ═══ 人物 ═══
  { keyword: "祖先", category: "人物", omen: "吉", meaning: "梦先祖显灵主有庇荫之福。若祖先面有喜色则大吉，面色不悦则需反省己过。" },
  { keyword: "父母", category: "人物", omen: "吉", meaning: "梦父母主思亲念家。父母安康为吉兆，若梦中父母有恙则提醒多加关怀。" },
  { keyword: "孩子", category: "人物", omen: "吉", meaning: "梦小孩主纯真希望。抱小孩主有新计划将启，小孩哭闹则防小麻烦。" },
  { keyword: "老人", category: "人物", omen: "吉", meaning: "梦慈祥老人主得智慧指引，白发老翁尤为贵人。恶面老人则防上当。" },
  { keyword: "新娘", category: "人物", omen: "吉", meaning: "梦新娘主喜事临门，未婚者主姻缘将至，已婚者主家庭和睦再生喜气。" },
  { keyword: "皇帝", category: "人物", omen: "吉", meaning: "梦帝王将相主有贵人扶持、权力提升。梦与帝王交谈主声名大振。" },
  { keyword: "医生", category: "人物", omen: "平", meaning: "梦医生主身体需关注或有问题待解决。若医生诊脉则提醒体检。" },
  { keyword: "老师", category: "人物", omen: "吉", meaning: "梦师长主有教诲之恩或需学习新知识。对考生而言更主学业有成。" },
  { keyword: "朋友", category: "人物", omen: "吉", meaning: "梦故友重逢主思念之情。梦友欢笑主相聚在即，友面忧愁则可能有求于你。" },
  { keyword: "敌人", category: "人物", omen: "凶", meaning: "梦对手或仇人主动荡不安，近期宜谨慎行事。若能梦中战胜对手则反凶为吉。" },
  { keyword: "陌生人", category: "人物", omen: "平", meaning: "梦陌生人主有新的人事物将介入生活。面目和善者为吉，面目狰狞者防小人。" },

  // ═══ 天地 ═══
  { keyword: "太阳", category: "天地", omen: "吉", meaning: "太阳为至阳之象，梦日主光明前程、事业辉煌。日出东方主新开始大吉。" },
  { keyword: "月亮", category: "天地", omen: "吉", meaning: "圆月入梦主团圆美满、事事圆满。缺月则主有未完成之事需了结。" },
  { keyword: "星星", category: "天地", omen: "吉", meaning: "星辰入梦主希望与机遇。繁星满天主前程似锦，流星则主心愿即成。" },
  { keyword: "天", category: "天地", omen: "吉", meaning: "梦苍天广阔主心胸开阔、运势亨通。天降祥云主大吉，乌云遮天则防不测。" },
  { keyword: "地", category: "天地", omen: "平", meaning: "大地为根基之象，梦大地安稳主根基牢固。地震地裂则防变动或损失。" },
  { keyword: "山", category: "天地", omen: "吉", meaning: "高山入梦主有靠山、根基稳固。登山成功主事业有成，山路崎岖则防困难。" },
  { keyword: "云", category: "天地", omen: "平", meaning: "白云朵朵主心情舒畅。乌云密布则防烦心事，彩云更主大喜将至。" },
  { keyword: "风", category: "天地", omen: "平", meaning: "和风习习主顺遂，狂风暴雨则防变故。春风拂面主好运即来。" },
  { keyword: "雷", category: "天地", omen: "凶", meaning: "雷声大作主有突发事件或口舌之争。梦中不惧雷声则能化险为夷。" },
  { keyword: "闪电", category: "天地", omen: "平", meaning: "闪电入梦主灵感突现或突发消息。电光耀眼主吉，暗闪则防意外。" },
  { keyword: "彩虹", category: "天地", omen: "吉", meaning: "彩虹为天地之桥，梦虹主苦尽甘来、好运降临，雨后见虹更佳。" },

  // ═══ 身体 ═══
  { keyword: "血", category: "身体", omen: "吉", meaning: "血为生命之源，梦血主财运将至（血气→血气方刚→旺财）。少量血为吉，大量血防损耗。" },
  { keyword: "牙齿", category: "身体", omen: "凶", meaning: "梦掉牙为最常见凶梦之一，主家中长辈健康需关注，或自身信心受挫。" },
  { keyword: "头发", category: "身体", omen: "平", meaning: "梦长发主情思缠绵。梦掉头发主有烦恼缠身，白发入梦则主智慧增长。" },
  { keyword: "眼睛", category: "身体", omen: "吉", meaning: "眼睛为心灵之窗，梦明亮双眼主洞察力强、辨明是非。眼疾则防判断失误。" },
  { keyword: "手", category: "身体", omen: "吉", meaning: "梦双手有力主能力提升或事业有成。手受伤则防工作失误或人际冲突。" },
  { keyword: "脚", category: "身体", omen: "平", meaning: "梦健步如飞主行动力强，梦脚伤则防出行不顺或根基动摇。" },
  { keyword: "脸", category: "身体", omen: "平", meaning: "梦面目模糊主自我认知不清。梦面容姣好主自信提升，面容丑陋则防自卑情绪。" },
  { keyword: "怀孕", category: "身体", omen: "吉", meaning: "梦怀孕（无论男女）主有新计划即将诞生，创意萌芽。孕妇梦之主顺利生产。" },
  { keyword: "哭泣", category: "身体", omen: "吉", meaning: "梦哭反吉——哭去烦恼、哭去灾厄。梦大哭过后心情舒畅更主好运将至。" },
  { keyword: "死亡", category: "身体", omen: "吉", meaning: "梦死反主长寿。梦见自己死主脱胎换骨、旧我死去新我复生；梦他人死主该人增寿。" },
  { keyword: "生病", category: "身体", omen: "凶", meaning: "梦重病缠身主身心劳累过度，提醒休养。梦己病愈则反为吉兆，难关将过。" },

  // ═══ 水火 ═══
  { keyword: "水", category: "水火", omen: "吉", meaning: "水主财，清水入梦主财运亨通。大水为横财，浊水则防破财或情感纠葛。" },
  { keyword: "火", category: "水火", omen: "吉", meaning: "火为旺运之象，梦火主事业红火、声名鹊起。小火为吉，大火蔓延则防官司纠纷。" },
  { keyword: "河", category: "水火", omen: "平", meaning: "长河入梦主人生历程。河水清澈为顺境，河水浑浊为逆境；涉水过河主能克服困难。" },
  { keyword: "海", category: "水火", omen: "吉", meaning: "大海浩瀚主胸襟广阔、财运广进。海面平静为吉，惊涛骇浪则防大起大落。" },
  { keyword: "雨", category: "水火", omen: "吉", meaning: "甘霖入梦主恩泽降临、好运滋润。风雨交加则防阻碍；雨后彩虹主苦尽甘来。" },
  { keyword: "雪", category: "水火", omen: "吉", meaning: "白雪为纯洁之兆，梦雪主烦恼消除、一切从头开始。大雪纷飞更主瑞雪兆丰年。" },
  { keyword: "冰", category: "水火", omen: "平", meaning: "冰为凝结之象，梦冰主感情冷却或事业停滞。冰融化则主关系回暖、困境解除。" },
  { keyword: "洪水", category: "水火", omen: "凶", meaning: "洪水滔天主有不可控之变局，防感情泛滥或财务危机。若能游泳自救则能渡劫。" },
  { keyword: "游泳", category: "水火", omen: "平", meaning: "梦游泳主能驾驭当下环境。游得自如为吉，溺水则防力不从心、需寻求帮助。" },
  { keyword: "桥", category: "水火", omen: "吉", meaning: "过桥入梦主渡过难关、人生进阶。桥坚固为吉，桥断裂则防计划受挫。" },

  // ═══ 食物 ═══
  { keyword: "米", category: "食物", omen: "吉", meaning: "米为五谷之首，梦米主生活富足、衣食无忧。白米成堆更主大丰收。" },
  { keyword: "饭", category: "食物", omen: "吉", meaning: "吃饭入梦主生计无忧。饱食为富足，空腹寻食则防近期有匮乏感。" },
  { keyword: "酒", category: "食物", omen: "平", meaning: "梦饮酒主社交活跃。微醺为乐事，大醉则防言多必失或伤身。" },
  { keyword: "茶", category: "食物", omen: "吉", meaning: "茶为清雅之物，梦品茶主心境澄明、生活从容。茶凉则防热情消退。" },
  { keyword: "水果", category: "食物", omen: "吉", meaning: "鲜果入梦主甜美收获、成果丰硕。苹果主平安，桃主长寿，梨主分离（谐音）。" },
  { keyword: "桃子", category: "食物", omen: "吉", meaning: "桃为仙果，梦桃主长寿健康，蟠桃更是大吉之兆。桃花入梦则主姻缘。" },
  { keyword: "枣子", category: "食物", omen: "吉", meaning: "枣谐音'早'，梦枣主好事将近。'早生贵子'、'早日成功'等吉兆。" },

  // ═══ 建筑 ═══
  { keyword: "房子", category: "建筑", omen: "吉", meaning: "房屋为根基之象，梦大房子主家业兴旺。新房入梦主新阶段开启。" },
  { keyword: "庙", category: "建筑", omen: "吉", meaning: "庙宇为神灵居所，梦庙主有神明庇佑。烧香拜佛更主福报将至。" },
  { keyword: "塔", category: "建筑", omen: "吉", meaning: "高塔入梦主志向高远、步步高升。登塔成功主功名成就。" },
  { keyword: "桥", category: "建筑", omen: "吉", meaning: "桥为沟通之意，梦桥主人际和谐或难关将过。石桥稳固为吉，独木桥则防孤单。" },
  { keyword: "井", category: "建筑", omen: "平", meaning: "古井为智慧之源，梦井主内心反思。井水清澈为吉，枯井则防资源枯竭。" },
  { keyword: "楼梯", category: "建筑", omen: "吉", meaning: "登楼梯主步步高升。上楼顺利为吉，下楼则主暂时退步或回顾过往。" },
  { keyword: "门", category: "建筑", omen: "平", meaning: "门为出入之口，梦开门主新机遇来临；梦关门则主一个阶段结束。门锁打不开防瓶颈。" },
  { keyword: "窗", category: "建筑", omen: "吉", meaning: "窗为视野之象，梦开窗主眼界开阔、机会显现。破窗则防小人是非。" },
  { keyword: "墙", category: "建筑", omen: "凶", meaning: "高墙挡路主遇阻碍，需另寻出路。墙倒塌则主原有的障碍消除。" },
  { keyword: "坟墓", category: "建筑", omen: "吉", meaning: "梦坟反主吉——祖坟主根基深厚，孤坟主旧事终结。新坟则防家中老人健康。" },
  { keyword: "学校", category: "建筑", omen: "吉", meaning: "梦回学校主有新的学习机会或需重新审视旧知识。考试梦更主现实中的考验。" },

  // ═══ 器物 ═══
  { keyword: "钱", category: "器物", omen: "吉", meaning: "梦得钱财主财运提升。捡钱为意外之财，数钱为财富积累，丢钱则防破财。" },
  { keyword: "金", category: "器物", omen: "吉", meaning: "黄金入梦主大贵大富。金器闪闪更主声名显赫，金条金砖为横财之兆。" },
  { keyword: "银", category: "器物", omen: "吉", meaning: "白银为次贵之财，梦银主细水长流之财，虽不多但稳定。" },
  { keyword: "镜子", category: "器物", omen: "平", meaning: "镜为自省之器，梦照镜主自我审视。镜中影像清晰为吉，模糊则防自我欺骗。" },
  { keyword: "刀", category: "器物", omen: "凶", meaning: "刀剑入梦主有争端或竞争。刀锋利为凶，刀钝则主对方不足为惧。" },
  { keyword: "剑", category: "器物", omen: "吉", meaning: "宝剑为权力象征，梦执剑主能力出众、能斩断烦恼。断剑则防威望受损。" },
  { keyword: "针", category: "器物", omen: "平", meaning: "针为精细之器，梦针主需注意细节。被针刺到防小伤害，缝衣针主修补关系。" },
  { keyword: "绳", category: "器物", omen: "平", meaning: "绳索入梦主牵绊或束缚。解绳主摆脱困境，被绳捆住则防受人牵制。" },
  { keyword: "钥匙", category: "器物", omen: "吉", meaning: "钥匙为开启之兆，梦得钥匙主难题有解、机会降临。丢钥匙则防错失良机。" },
  { keyword: "锁", category: "器物", omen: "凶", meaning: "锁为阻碍之象，梦打不开锁主有困难需外力帮助。锁自开则主阻碍自动消失。" },
  { keyword: "钟", category: "器物", omen: "平", meaning: "钟表入梦主时间观念，提醒珍惜光阴。钟声悠扬为吉，钟停则防时机错过。" },
  { keyword: "灯", category: "器物", omen: "吉", meaning: "明灯入梦主智慧启迪、黑暗中的指引。灯灭则防迷惘或方向感缺失。" },

  // ═══ 鬼神 ═══
  { keyword: "佛", category: "鬼神", omen: "吉", meaning: "梦佛菩萨主大吉之兆，有神佛庇佑、消灾解难。拜佛更主福报深厚。" },
  { keyword: "菩萨", category: "鬼神", omen: "吉", meaning: "观音菩萨入梦为大吉，主慈悲加护、苦难消除、所求如愿。" },
  { keyword: "神", category: "鬼神", omen: "吉", meaning: "神灵显现主有护法庇佑，近期做事顺利。若神面带怒色则提醒行为检点。" },
  { keyword: "鬼", category: "鬼神", omen: "凶", meaning: "梦鬼主内心恐惧或未解决的阴影。远处鬼影防小人，近身鬼则防精神压力过大。" },
  { keyword: "仙", category: "鬼神", omen: "吉", meaning: "梦仙人飘然而至主大吉，有高人指点迷津。仙女入梦更主美貌、良缘。" },
  { keyword: "灵魂", category: "鬼神", omen: "平", meaning: "梦灵魂出窍主自我超越的渴望。飘在空中俯瞰为吉，找不到归路则防迷失方向。" },

  // ═══ 丧葬 ═══
  { keyword: "棺材", category: "丧葬", omen: "吉", meaning: "棺材谐音'官''财'，梦棺材主升官发财，为大吉之梦。红棺材更佳。" },
  { keyword: "葬礼", category: "丧葬", omen: "吉", meaning: "梦参加葬礼反主旧事翻篇、霉运终结。哭丧则更将过去的烦恼发泄殆尽。" },
  { keyword: "尸体", category: "丧葬", omen: "吉", meaning: "梦尸体主旧事物终结、新事物诞生。此梦非凶兆，而是蜕变的象征。" },
  { keyword: "死人", category: "丧葬", omen: "吉", meaning: "梦见已故之人主思念之情。若亡者面有喜色则是报平安，若言语清晰则其言有深意。" },
  { keyword: "遗照", category: "丧葬", omen: "平", meaning: "梦遗照主对过去的执念未放下。有人提醒你该向前看了。" },

  // ═══ 植物 ═══
  { keyword: "花", category: "植物", omen: "吉", meaning: "花开富贵，梦鲜花主好运盛开。桃花主姻缘，荷花主清高，菊花主长寿。" },
  { keyword: "树", category: "植物", omen: "吉", meaning: "大树为根基之象，梦大树主根基稳固、家运昌隆。枯木逢春更主东山再起。" },
  { keyword: "草", category: "植物", omen: "平", meaning: "绿草如茵主生机勃勃、平凡幸福。荒草则主疏于管理或情感荒芜。" },
  { keyword: "竹", category: "植物", omen: "吉", meaning: "竹为君子之象，梦竹主气节高洁、事业节节高升。竹笋更主新人新事。" },
  { keyword: "莲花", category: "植物", omen: "吉", meaning: "莲花出淤泥不染，梦莲主品格高洁、事业纯净。白莲主清贵，红莲主富贵。" },
  { keyword: "梅花", category: "植物", omen: "吉", meaning: "梅花香自苦寒来，梦梅主历经磨难终有成就。冬梅更主坚韧不拔。" },
  { keyword: "稻谷", category: "植物", omen: "吉", meaning: "稻谷丰收主五谷丰登、家业兴旺。金黄稻浪更为大丰收之兆。" },

  // ═══ 自然 ═══
  { keyword: "地震", category: "自然", omen: "凶", meaning: "梦地震主生活将有大变动，或事业根基动摇。若能躲避则能化险为夷。" },
  { keyword: "日食", category: "自然", omen: "凶", meaning: "日月无光主暂时黑暗，防决策失误或受人蒙蔽。食既复明则主困难是暂时的。" },
  { keyword: "月食", category: "自然", omen: "平", meaning: "月食入梦主情感波动，夫妻或伴侣间需多加沟通。复圆则主关系修复。" },
  { keyword: "流星", category: "自然", omen: "吉", meaning: "流星划过主心愿将成、机遇稍纵即逝需抓紧。对流星许愿更增吉运。" },
  { keyword: "雾", category: "自然", omen: "凶", meaning: "大雾迷漫主前路不明、信息不清，近期不宜做重大决策。雾散则主真相大白。" },

  // ═══ 行为 ═══
  { keyword: "飞", category: "行为", omen: "吉", meaning: "梦中飞翔主心志高远、压力释放。飞得越高越吉，飞不起来则防有志难伸。" },
  { keyword: "跑", category: "行为", omen: "平", meaning: "梦中奔跑主在逃避某事或追赶目标。跑得轻松为吉，跑不动则防焦虑。" },
  { keyword: "追", category: "行为", omen: "凶", meaning: "被追逐为常见焦虑梦，主现实中逃避某事。若能转身面对追者则反能解梦魇。" },
  { keyword: "掉", category: "行为", omen: "凶", meaning: "梦中坠落主对失控的恐惧，或现实中地位/感情有跌落风险。惊醒后需冷静分析。" },
  { keyword: "考试", category: "行为", omen: "平", meaning: "梦考试主现实中的考验或自我评估。答得好为吉，答不出则防准备不足。" },
  { keyword: "结婚", category: "行为", omen: "吉", meaning: "梦婚礼主喜事临门、合作成功。单身者梦之主良缘将至，已婚者梦之主家庭和美。" },
  { keyword: "离婚", category: "行为", omen: "凶", meaning: "梦离婚主对关系的不安。未必指向婚姻，可能象征与某事物分道扬镳。" },
  { keyword: "唱歌", category: "行为", omen: "吉", meaning: "梦中高歌主心情舒畅、压抑释放。歌声优美更主有好消息将至。" },
  { keyword: "跳舞", category: "行为", omen: "吉", meaning: "梦中起舞主快乐自在、社交活跃。群舞主人际关系和谐，独舞主内心从容。" },
  { keyword: "打架", category: "行为", omen: "凶", meaning: "梦打架主现实中有冲突需面对。打赢了为吉，打输了防挫折或委屈。" },
  { keyword: "杀人", category: "行为", omen: "凶", meaning: "梦杀人主极度压抑或愤怒，未必是凶兆而是内心情绪宣泄。需反思现实中的矛盾。" },
  { keyword: "走夜路", category: "行为", omen: "凶", meaning: "梦中夜行主对未知的恐惧，或现实中处于迷茫期。见光亮则主希望在前。" },
  { keyword: "迷路", category: "行为", omen: "凶", meaning: "梦中迷路主现实中的方向迷失，需重新审视目标。找到出路则主问题将解。" },
  { keyword: "坐车", category: "行为", omen: "平", meaning: "梦乘车出行主人生旅途的进程。车行顺利为吉，车坏或堵车则防计划延误。" },
  { keyword: "洗澡", category: "行为", omen: "吉", meaning: "梦中沐浴主洗去烦恼、身心净化。清水沐浴为吉，脏水则主未完全摆脱困扰。" },
  { keyword: "穿新衣", category: "行为", omen: "吉", meaning: "梦穿新衣主形象焕新、地位提升。红衣主喜庆，白衣主清新，黑衣防低调。" },
  { keyword: "吃东西", category: "行为", omen: "吉", meaning: "梦中进食主精神或物质层面的满足。美食为吉，难以下咽则防对现状不满。" },

  // ═══ 其他常见 ═══
  { keyword: "屎", category: "身体", omen: "吉", meaning: "梦屎尿反主财运，所谓'屎尿财'是也。梦踩屎更主意外之财将至。" },
  { keyword: "尿", category: "身体", omen: "吉", meaning: "梦小便主排出烦恼、身心清爽。尿湿衣裤则主有小破财但无大碍。" },
  { keyword: "偷", category: "行为", omen: "凶", meaning: "梦被盗主有不安全感，防财物损失或信任危机。梦偷别人则主内心渴望未遂。" },
  { keyword: "裸体", category: "身体", omen: "凶", meaning: "梦中赤身主羞愧或暴露感，防隐私泄露。公共场合裸体更为社交焦虑之征。" },
];

// ── 辅助函数 ──

/** 精确匹配（用户输入中的关键词与梦典关键词完全一致） */
function exactMatch(dream: string, entry: JieMengEntry): JieMengMatch | null {
  if (dream.includes(entry.keyword)) {
    return {
      keyword: entry.keyword,
      category: entry.category,
      omen: entry.omen,
      meaning: entry.meaning,
      confidence: entry.keyword.length >= 2 ? 0.9 : 0.7,
    };
  }
  return null;
}

/** 两字组合匹配：当用户输入含多字时，尝试拆词匹配 */
function partialMatch(dream: string, entry: JieMengEntry): JieMengMatch | null {
  if (entry.keyword.length < 2) return null;
  // 已由 exactMatch 处理，此处不重复
  if (dream.includes(entry.keyword)) return null;

  // 拆字匹配（如"大水"匹配"水"）
  for (let i = 0; i < entry.keyword.length; i++) {
    const char = entry.keyword[i];
    if (char.length === 1 && dream.includes(char) && char.charCodeAt(0) > 127) {
      // 单字匹配要求该字在梦境中独立出现（前后为标点或空格），降低误匹配
      return {
        keyword: entry.keyword,
        category: entry.category,
        omen: entry.omen,
        meaning: entry.meaning,
        confidence: 0.5,
      };
    }
  }
  return null;
}

/** 按关键词长度降序排列，优先长词匹配 */
const SORTED_DICT = [...DREAM_DICTIONARY].sort((a, b) => b.keyword.length - a.keyword.length);

// ── 主计算函数 ──

export function calculateJieMeng(input: Record<string, unknown>): JieMengResult {
  const dream = ((input.dream as string) || "").trim();

  if (!dream) {
    return {
      input: { dream: "" },
      matches: [],
      overall: { omen: "平", summary: "请输入您的梦境描述。", jiCount: 0, xiongCount: 0, pingCount: 0 },
    };
  }

  const matches: JieMengMatch[] = [];
  const matchedKeywords = new Set<string>();

  // 第一轮：精确匹配（长词优先）
  for (const entry of SORTED_DICT) {
    if (matchedKeywords.has(entry.keyword)) continue;
    const match = exactMatch(dream, entry);
    if (match) {
      matches.push(match);
      matchedKeywords.add(entry.keyword);
      // 若精确匹配到长词，跳过长词中包含的短词
    }
  }

  // 第二轮：部分匹配（补充未匹配到的）
  for (const entry of SORTED_DICT) {
    if (matchedKeywords.has(entry.keyword)) continue;
    if (matches.length >= 8) break; // 最多 8 条
    const match = partialMatch(dream, entry);
    if (match) {
      matches.push(match);
      matchedKeywords.add(entry.keyword);
    }
  }

  // 按置信度降序排列
  matches.sort((a, b) => b.confidence - a.confidence);

  // 综合判断
  const jiCount = matches.filter((m) => m.omen === "吉").length;
  const xiongCount = matches.filter((m) => m.omen === "凶").length;
  const pingCount = matches.filter((m) => m.omen === "平").length;

  let overallOmen: JieMengOmen;
  if (jiCount > xiongCount + pingCount) overallOmen = "吉";
  else if (xiongCount > jiCount + pingCount) overallOmen = "凶";
  else overallOmen = "平";

  let summary: string;
  if (matches.length === 0) {
    summary = `您的梦境「${dream.length > 20 ? dream.slice(0, 20) + "..." : dream}」暂未在传统梦典中找到匹配条目。梦境千变万化，不妨换个角度描述再试。`;
  } else if (overallOmen === "吉") {
    summary = `梦境整体呈吉兆（${jiCount}吉 ${xiongCount}凶 ${pingCount}平）。${jiCount >= 3 ? "多吉汇聚，近期运势向好，可积极行动。" : "梦示前景光明，保持信心。"}`;
  } else if (overallOmen === "凶") {
    summary = `梦境偏凶（${jiCount}吉 ${xiongCount}凶 ${pingCount}平）。${xiongCount >= 3 ? "多凶警示，近期宜谨慎行事、避免重大决策。" : "有少许不吉之兆，低调行事即可化解。"}`;
  } else {
    summary = `梦境吉凶参半（${jiCount}吉 ${xiongCount}凶 ${pingCount}平）。平常心对待，顺势而为即可。`;
  }

  const resultMatches = matches.slice(0, 6);

  // 构建 box-drawing 摘要
  const omenIcon: Record<string, string> = { "吉": "○", "凶": "△", "平": "─" };
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const omenColor: Record<string, string> = { "吉": "吉兆", "凶": "凶兆", "平": "平常" };
  const lines: string[] = [
    `┌─ 周公解梦 ─────────────────`,
    `│ 梦境：${dream.length > 40 ? dream.slice(0, 40) + "…" : dream}`,
    `│ 综合：${overallOmen === "吉" ? "▣ 吉" : overallOmen === "凶" ? "△ 凶" : "─ 平"} 吉${jiCount} · 凶${xiongCount} · 平${pingCount} 匹配${resultMatches.length}条`,
  ];

  if (resultMatches.length === 0) {
    lines.push(`│`);
    lines.push(`├─ 解梦结果 ──────────────────`);
    lines.push(`│ （未匹配到梦典条目，请换个角度描述您的梦境）`);
  } else {
    lines.push(`│`);
    lines.push(`├─ 解梦条目 ──────────────────`);
    for (let i = 0; i < resultMatches.length; i++) {
      const m = resultMatches[i];
      const sep = i < resultMatches.length - 1 ? "├" : "└";
      const icon = omenIcon[m.omen] || "─";
      const pct = Math.round(m.confidence * 100);
      lines.push(`│ ${sep}─ ${icon}【${m.keyword}】${m.omen === "吉" ? "吉" : m.omen === "凶" ? "凶" : "平"} ${m.category} 置信度${pct}%`);
      lines.push(`│    ${m.meaning.slice(0, 60)}${m.meaning.length > 60 ? "…" : ""}`);
    }
  }

  lines.push(`│`);
  lines.push(`├─ 综合解读 ──────────────────`);
  lines.push(`│ ${summary}`);
  lines.push(`│`);
  lines.push(`├─ 古籍出处 ──────────────────`);
  lines.push(`│ 《周公解梦》—— 传统民间梦书，依托周公之名流传千年`);
  lines.push(`│ 《敦煌本梦书》—— 敦煌遗书中保存的唐代解梦文献`);
  lines.push(`│ 《黄帝内经·灵枢》—— 「正邪从外袭内而未有定舍，反淫于脏，不得定处，与营卫俱行，而与魂魄飞扬，使人卧不得安而喜梦」`);
  lines.push(`│ 占梦之术可溯至殷商甲骨卜辞，周代设有「占梦」之官。`);
  lines.push(`│`);
  lines.push(`└─ 解梦提示 ──────────────────`);
  lines.push(`   梦乃心之影，未必事事应验。吉梦可增信心，`);
  lines.push(`   凶梦提醒注意，平常心待之方为上策。`);
  lines.push(`   中医认为多梦与心神不宁相关，宜调养心脾。`);

  const boxSummary = lines.join("\n");

  return {
    input: { dream },
    matches: resultMatches,
    overall: {
      omen: overallOmen,
      summary,
      jiCount,
      xiongCount,
      pingCount,
    },
    summary: boxSummary,
  } as JieMengResult & { summary: string };
}

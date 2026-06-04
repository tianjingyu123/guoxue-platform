<template>
  <view class="page">
    <!-- 导航栏 -->
    <view class="nav">
      <view class="nav-left">
        <text class="nav-back" @click="goBack">←</text>
        <text class="nav-title">通讯录</text>
      </view>
      <view class="nav-right">
        <text class="nav-btn" @click="openSearch">🔍</text>
        <text class="nav-btn" @click="goAddFriend">＋</text>
      </view>
    </view>

    <!-- 主内容区 -->
    <view class="main-content">
      <!-- 列表区域 -->
      <scroll-view
        scroll-y
        class="scroll-list"
        :scroll-into-view="scrollIntoView"
        @scroll="onScroll"
      >
        <DataState
          :is-loading="loading"
          :error="loadError"
          :is-empty="!loading && letterGroups.length === 0"
          empty-icon="👥"
          empty-title="暂无好友"
          empty-description="快去添加好友吧"
          skeleton-type="list"
          @retry="fetchFriends"
        >
          <view
            v-for="group in letterGroups"
            :key="group.letter"
            :id="'group-' + group.letter"
            class="letter-group"
          >
            <view class="letter-header">
              <text class="letter-label">{{ group.letter }}</text>
            </view>
            <view class="friends-wrap">
              <view
                v-for="f in group.friends"
                :key="f.id"
                class="friend-item"
                @click="selectFriend(f)"
              >
                <view class="friend-avatar-wrap">
                  <image :src="f.avatar || ''" class="friend-avatar" mode="aspectFill" />
                  <view v-if="f.isOnline" class="online-dot" />
                </view>
                <view class="friend-info">
                  <text class="friend-name">{{ f.remark || f.nickname }}</text>
                  <text v-if="f.remark" class="friend-nickname">({{ f.nickname }})</text>
                  <text v-if="f.signature" class="friend-signature">{{ f.signature }}</text>
                  <text v-else-if="f.lastActiveAt && !f.isOnline" class="friend-active">{{ f.lastActiveAt }}活跃</text>
                </view>
              </view>
            </view>
          </view>
        </DataState>
      </scroll-view>

      <!-- 右侧字母索引条 -->
      <view v-if="letterList.length > 0" class="letter-index">
        <text
          v-for="(l, i) in letterList"
          :key="l"
          class="index-letter"
          :class="{ active: activeIndex === i }"
          @click="scrollToLetter(l)"
        >{{ l }}</text>
      </view>
    </view>

    <!-- 搜索弹层 -->
    <view v-if="showSearch" class="sheet-mask" @click="closeSearch">
      <view class="sheet-content sheet-full" @click.stop>
        <view class="search-header">
          <text class="search-header-title">搜索好友</text>
        </view>
        <view class="search-body">
          <view class="search-input-wrap">
            <text class="search-icon">🔍</text>
            <input
              v-model="searchKeyword"
              class="search-input"
              placeholder="搜索昵称、备注"
              focus
            />
            <text v-if="searchKeyword" class="search-clear" @click="clearSearch">✕</text>
          </view>
          <view class="search-results">
            <view v-if="isSearching" class="search-status">搜索中...</view>
            <view v-else-if="searchKeyword">
              <view v-if="searchResults.length > 0" class="search-list">
                <view
                  v-for="f in searchResults"
                  :key="f.id"
                  class="friend-item"
                  @click="selectFriend(f)"
                >
                  <image :src="f.avatar || ''" class="friend-avatar" mode="aspectFill" />
                  <view class="friend-info">
                    <text class="friend-name">{{ f.remark || f.nickname }}</text>
                    <text v-if="f.signature" class="friend-signature">{{ f.signature }}</text>
                  </view>
                </view>
              </view>
              <view v-else class="search-status">未找到相关好友</view>
            </view>
            <view v-else class="search-status">输入关键词搜索好友</view>
          </view>
        </view>
      </view>
    </view>

    <!-- 好友操作弹窗 -->
    <view v-if="selectedFriend" class="sheet-mask" @click="selectedFriend = null">
      <view class="sheet-content sheet-bottom" @click.stop>
        <view class="friend-profile">
          <view class="friend-avatar-big-wrap">
            <image :src="selectedFriend.avatar || ''" class="friend-avatar-big" mode="aspectFill" />
            <view v-if="selectedFriend.isOnline" class="online-dot-lg" />
          </view>
          <view class="friend-detail">
            <text class="friend-detail-name">{{ selectedFriend.remark || selectedFriend.nickname }}</text>
            <text v-if="selectedFriend.remark" class="friend-detail-sub">昵称: {{ selectedFriend.nickname }}</text>
            <text v-if="selectedFriend.signature" class="friend-detail-signature">{{ selectedFriend.signature }}</text>
            <text class="friend-detail-status" :class="{ online: selectedFriend.isOnline }">
              {{ selectedFriend.isOnline ? '在线' : selectedFriend.lastActiveAt ? selectedFriend.lastActiveAt + '活跃' : '离线' }}
            </text>
          </view>
        </view>
        <view class="action-row">
          <view class="action-btn action-btn-primary" @click="friendAction('chat')">
            <text>💬</text>
            <text>发消息</text>
          </view>
          <view class="action-btn action-btn-outline" @click="friendAction('profile')">
            <text>👤</text>
            <text>查看主页</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import DataState from '../../components/DataState.vue'
import { api, imApi } from '../../api'

interface FriendItem {
  id: string
  nickname: string
  remark?: string
  avatar?: string
  signature?: string
  isOnline?: boolean
  lastActiveAt?: string
}

interface FriendGroup {
  letter: string
  friends: FriendItem[]
}

const loading = ref(true)
const loadError = ref<string | null>(null)
const friends = ref<FriendItem[]>([])
const searchKeyword = ref('')
const searchResults = ref<FriendItem[]>([])
const isSearching = ref(false)
const showSearch = ref(false)
const selectedFriend = ref<FriendItem | null>(null)
const activeIndex = ref(0)
const scrollIntoView = ref('')

// 拼音分组
const letterGroups = computed<FriendGroup[]>(() => {
  return groupByPinyin(friends.value)
})

const letterList = computed<string[]>(() => {
  return letterGroups.value.map(g => g.letter)
})

function goBack() {
  uni.navigateBack()
}

async function fetchFriends() {
  loading.value = true
  loadError.value = null
  try {
    const data = await imApi.getFriendList()
    friends.value = Array.isArray(data) ? data : []
  } catch (e: any) {
    loadError.value = e?.errMsg || e?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFriends()
})

// 获取拼音首字母
function getPinyinInitial(name: string): string {
  if (!name) return "#"
  const firstChar = name.charAt(0)
  const code = firstChar.charCodeAt(0)
  if (code >= 65 && code <= 90) return firstChar
  if (code >= 97 && code <= 122) return firstChar.toUpperCase()
  if (code >= 0x4e00 && code <= 0x9fff) {
    // 26字母拼音首字母映射
    const pinyinMap: Record<string, string> = {
      'A': '阿埃安奥',
      'B': '芭捌拔跋靶把耙坝霸罢白柏百摆佰败拜稗斑搬扳般颁板版扮拌伴瓣半办绊邦帮梆榜绑棒磅蚌镑傍谤苞胞包褒剥薄雹保堡饱宝抱报暴豹鲍爆杯碑悲卑北辈背贝钡倍狈备惫焙被奔苯本笨崩绷甭泵蹦迸逼鼻比鄙笔彼碧蓖蔽毕毙毖币庇痹闭敝弊必秘辟壁臂避陛鞭边编贬扁便变卞辨辩辫遍标彪膘表鳖憋别瘪彬斌濒滨宾摈兵冰柄丙秉饼炳病并玻菠播拨钵波博勃搏铂箔伯帛舶脖膊渤泊驳捕卜哺补埠不布步簿部怖',
      'C': '猜裁材才财睬踩采彩菜蔡餐参蚕残惭惨灿苍舱仓沧藏操糙槽曹草厕策侧册测层蹭插叉茬茶查碴搽察岔差诧拆柴豺搀掺蝉馋谗缠铲产阐颤昌猖场尝常长偿肠厂敞畅唱倡超抄钞朝嘲潮巢吵炒车扯撤掣彻澈郴臣辰尘晨忱沉陈趁衬撑称城橙成呈乘程惩澄诚承逞骋秤吃痴持匙池迟弛驰耻齿侈尺赤翅斥炽充冲虫崇宠抽酬畴踌稠愁筹仇绸瞅丑臭初出橱厨躇锄雏滁除楚础储矗搐触处揣川穿椽传船喘串疮窗幢床闯创吹炊捶锤垂春椿醇唇淳纯蠢戳绰疵茨磁雌辞慈瓷词此刺赐次聪葱囱匆从丛凑粗醋簇促蹿篡窜摧崔催脆瘁粹淬翠村存寸磋撮搓措挫错',
      'D': '搭达答瘩打大呆歹傣戴带殆代贷袋待逮怠耽担丹单郸掸胆旦氮但惮淡诞弹蛋当挡党荡档刀捣蹈倒岛祷导到稻悼道盗德得的瞪灯登等瞪凳邓堤低滴迪敌笛狄涤翟嫡抵底地蒂第帝弟递缔颠掂滇碘点典靛垫电佃甸店惦奠淀殿碉叼雕凋刁掉吊钓调跌爹碟蝶迭谍叠丁盯叮钉顶鼎锭定订丢东冬董懂动栋侗恫冻洞兜抖斗陡豆逗痘都督毒犊独读堵睹赌杜镀肚度渡妒端短锻段断缎堆兑队对墩吨蹲敦顿囤钝盾遁掇哆多夺垛躲朵跺舵剁惰堕',
      'E': '蛾峨鹅俄额讹蛾恶厄扼遏鄂饿恩而儿尔耳饵洱二贰',
      'F': '发罚筏伐乏阀法珐藩帆番翻樊矾钒繁凡烦反返范贩犯饭泛坊芳方肪房防妨仿访纺放菲非啡飞肥匪诽吠肺废沸费芬酚吩氛分纷坟焚汾粉份愤粪丰封枫蜂峰锋风疯烽逢冯缝讽奉凤佛否夫敷肤孵扶拂辐幅氟符伏俘服浮涪福袱弗甫抚辅俯釜斧脯腑府腐赴副覆赋复傅付阜父腹负富讣附妇缚咐',
      'G': '噶嘎该改概钙盖溉干甘杆柑竿肝赶感秆敢赣冈刚钢缸肛纲岗港杠篙皋高膏羔糕搞镐稿告哥歌搁戈鸽胳疙割革葛格蛤阁隔铬个各给根跟耕更庚羹耿梗工攻功恭龚供躬公宫弓巩汞拱贡共钩勾沟苟狗垢构购够辜菇咕箍估沽孤姑鼓古蛊骨谷股故顾固雇刮瓜剐寡挂褂乖拐怪棺关官冠观管馆罐惯灌贯光广逛瑰规圭硅归龟闺轨鬼诡癸桂柜跪贵刽辊滚棍锅郭国果裹过',
      'H': '哈骸孩海氦亥害骇酣憨邯韩含涵寒函喊罕翰撼捍旱憾悍焊汗汉夯杭航壕嚎豪毫郝好耗号浩呵喝荷菏核禾和何合盒貉阂河涸赫褐鹤贺嘿黑痕很狠恨哼亨横衡恒轰哄烘虹鸿洪宏弘红喉侯猴吼厚候后呼乎忽瑚壶葫胡蝴狐糊湖弧虎唬护互沪户花哗华猾滑画划化话槐徊怀淮坏欢环桓还缓换患唤痪豢焕涣宦幻荒慌黄磺蝗簧皇凰惶煌晃幌恍谎灰挥辉徽恢蛔回毁悔慧卉惠晦贿秽会烩汇讳诲绘荤昏婚魂浑混豁活伙火获或惑霍货祸',
      'J': '击圾基机畸稽积箕肌饥迹激讥鸡姬绩缉吉极棘辑籍集及急疾汲即嫉级挤几脊己蓟技冀季伎祭剂悸济寄寂计记既忌际妓继纪嘉枷夹佳家加荚颊贾甲钾假稼价架驾嫁歼监坚尖笺间煎兼肩艰奸缄茧检柬碱硷拣捡简俭剪减荐槛鉴践贱见键箭件健舰剑饯渐溅涧建僵姜将浆江疆蒋桨奖讲匠酱降蕉椒礁焦胶交郊浇骄娇嚼搅铰矫侥脚饺缴绞剿教酵轿较叫窖揭接皆秸街阶截劫节桔杰捷睫竭洁结解姐戒藉芥界借介疥诫届巾筋斤金今津襟紧锦仅谨进靳晋禁近烬浸尽劲荆兢茎睛晶鲸京惊精粳经井警景颈静境敬镜径痉靖竟竞净炯窘揪究纠玖韭久灸九酒厩救旧臼舅咎就疚鞠拘狙疽居驹菊局咀矩举沮聚拒据巨具距踞锯俱句惧炬剧捐鹃娟倦眷卷绢撅攫抉掘倔爵觉决诀绝均菌钧军君峻俊竣浚郡骏',
      'K': '喀咖卡咯开揩楷凯慨刊堪勘坎砍看康慷糠扛抗亢炕考拷烤靠坷苛柯棵磕颗科壳咳可渴克刻客课肯啃垦恳坑吭空恐孔控抠口扣寇枯哭窟苦酷库裤夸垮挎跨胯块筷侩快宽款匡筐狂框矿眶旷况亏盔岿窥葵奎魁馈愧溃坤昆捆困括扩廓阔',
      'L': '垃拉喇蜡腊辣啦莱来赖蓝婪栏拦篮阑兰澜谰揽览懒缆烂滥琅榔狼廊郎朗浪捞劳牢老佬姥酪烙涝勒乐雷镭蕾磊累儡垒擂肋类泪棱楞冷厘梨犁黎篱狸离漓理李里鲤礼莉荔吏栗丽厉励砾历利傈例俐痢立粒沥隶力璃哩俩联莲连镰廉怜涟帘敛脸链恋炼练粮凉梁粱良两辆量晾亮谅撩聊僚疗燎寥辽潦了撂镣廖料列裂烈劣猎琳林磷霖临邻鳞淋凛赁吝拎玲菱零龄铃伶羚凌灵陵岭领另令溜琉榴硫馏留刘瘤流柳六龙聋咙笼窿隆垄拢陇楼娄搂篓漏陋芦卢颅庐炉掳卤虏鲁麓碌露路赂鹿潞禄录陆戮驴吕铝侣旅履屡缕虑氯律率滤绿峦挛孪滦卵乱掠略抡轮伦仑沦纶论萝螺罗逻锣箩骡裸落洛骆络',
      'M': '妈麻玛码蚂马骂嘛吗埋买麦卖迈脉瞒馒蛮满蔓曼慢漫谩芒茫盲氓忙莽猫茅锚毛矛铆卯茂冒帽貌贸么玫枚梅酶霉煤没眉媒镁每美昧寐妹媚门闷们萌蒙檬盟锰猛梦孟眯醚靡糜迷谜弥米秘觅泌蜜密幂棉眠绵冕免勉娩缅面苗描瞄藐秒渺庙妙蔑灭民抿皿敏悯闽明螟鸣铭名命谬摸摹蘑模膜磨摩魔抹末莫墨默沫漠寞陌谋牟某拇牡亩姆母墓暮幕募慕木目睦牧穆',
      'N': '拿哪呐钠那娜纳氖乃奶耐奈南男难囊挠脑恼闹淖呢馁内嫩恁妮霓倪泥尼拟你匿腻逆溺蔫拈年碾撵捻念娘酿鸟尿捏聂孽啮镊镍涅您柠狞凝宁拧泞牛扭钮纽脓浓农弄奴努怒女暖虐疟挪懦糯',
      'O': '哦欧鸥殴藕呕偶沤',
      'P': '啪趴爬帕怕琶拍排牌徘湃派攀潘盘磐盼畔判叛乓庞旁耪胖抛咆刨炮袍跑泡呸胚培裴赔陪配佩沛喷盆砰烹彭蓬棚硼篷膨朋鹏捧碰坯砒霹批披劈琵毗啤脾疲皮匹痞僻屁譬篇偏片骗飘漂瓢票撇瞥拼频贫品聘乒坪苹萍平凭瓶评屏坡泼颇婆破魄迫粕剖扑铺仆莆葡菩蒲埔朴圃普浦谱曝瀑',
      'Q': '期欺栖戚妻七凄漆柒沏其棋奇歧畦崎脐旗祈祁骑起岂乞企启契砌器气迄弃汽泣讫掐洽牵扦钎铅千迁签仟谦乾黔钱钳前潜遣浅谴堑嵌欠歉枪呛腔羌墙蔷强抢橇锹敲悄桥瞧乔侨巧鞘撬翘峭俏窍切茄且怯窃钦侵亲秦琴勤芹擒禽寝沁青轻氢倾卿清擎晴氰情顷请庆琼穷秋丘邱球求囚酋泅趋区蛆曲躯屈驱渠取娶龋趣去圈颧权醛泉全痊拳犬券劝缺炔瘸却鹊榷确雀裙群',
      'R': '然燃冉染瓤壤攘嚷让饶扰绕惹热壬仁人忍韧任认刃妊纫扔仍日戎茸蓉荣融熔溶容绒冗揉柔肉茹蠕儒孺如辱乳汝入褥软阮蕊瑞锐闰润',
      'S': '撒洒萨腮鳃塞赛三叁伞散桑嗓丧搔骚扫嫂瑟色涩森僧莎砂杀刹沙纱傻啥煞筛晒珊苫杉山删煽衫闪陕擅赡膳善汕扇缮墒伤商赏晌上尚裳梢捎稍烧芍勺韶少哨邵绍奢赊蛇舌舍赦摄射慑涉社设砷申呻伸身深娠绅神沈审婶甚肾慎渗声生甥牲升绳省盛剩胜圣师失狮施湿诗尸虱十石拾时什食蚀实识史矢使屎驶始式示士世柿事拭誓逝势是嗜噬适仕侍释饰氏市恃室视试收手首守寿授售受瘦兽蔬枢梳殊抒输叔舒淑疏书赎孰熟薯暑曙署蜀黍鼠属术述树束戍竖墅庶数漱恕刷耍摔衰甩帅栓拴霜双爽谁水睡税吮瞬顺舜说硕朔烁斯撕嘶思私司丝死肆寺嗣四伺似饲巳松耸怂颂送宋讼诵搜艘擞嗽苏酥俗素速粟僳塑溯宿诉肃酸蒜算虽隋随绥髓碎岁穗遂隧祟孙损笋蓑梭唆缩琐索锁所',
      'T': '塌他它她塔獭挞蹋踏胎苔抬台泰酞太态汰摊贪瘫滩坛檀痰潭谭谈坦毯袒碳探叹炭汤塘搪堂棠膛唐糖倘躺淌趟烫掏涛滔绦萄桃逃淘陶讨套特藤腾疼誊梯剔踢锑提题蹄啼体替嚏惕涕剃屉天添填田甜恬舔腆挑条迢眺跳贴铁帖厅听烃汀廷停亭庭挺艇通桐酮同铜彤童桶捅筒统痛偷投头透凸秃突图徒途涂屠土吐兔湍团推颓腿蜕褪退吞屯臀拖托脱鸵陀驮驼椭妥拓',
      'W': '挖蛙蛙洼娃瓦袜歪外豌弯湾玩顽丸烷完碗挽晚皖惋宛婉万腕汪王亡枉网往旺望忘妄威巍微危韦违围唯惟为潍维苇萎委伟伪尾纬未蔚味畏胃喂魏位渭谓尉慰卫瘟温蚊文闻纹吻稳紊问嗡翁瓮挝蜗涡窝我斡卧握沃巫呜钨乌污诬屋无芜梧吾吴毋武五捂午舞伍侮坞戊雾晤物勿务悟',
      'X': '昔熙析西硒矽晰嘻吸锡牺稀息希悉膝夕惜熄烯溪汐犀檄袭席习媳喜铣洗系隙戏细瞎虾匣霞辖暇峡侠狭下厦夏吓掀锨先仙鲜纤咸贤衔舷闲涎弦嫌显险现献县腺馅羡宪陷限线相厢镶香箱襄湘乡翔祥详想响享项巷橡像向象萧硝霄削哮嚣销消宵淆晓小孝校肖啸笑效楔些歇蝎鞋协挟携邪斜胁谐写械卸蟹懈泄泻谢屑薪芯锌欣辛新忻心信衅星腥猩惺兴刑型形邢行醒幸杏性姓兄凶胸匈汹雄熊休修羞朽嗅锈秀袖绣墟戌需虚嘘须徐许蓄酗叙旭序畜恤絮婿绪续轩喧宣悬旋玄选癣眩绚靴薛学穴雪血勋熏循旬询寻驯巡殉汛训讯逊迅',
      'Y': '压押鸦鸭呀丫芽牙蚜崖衙涯雅哑亚讶焉咽阉烟淹盐严研蜒岩延言颜阎炎沿奄掩眼衍演艳堰燕厌砚雁唁彦焰宴谚验殃央鸯秧杨扬佯疡羊洋阳氧仰痒养样漾腰妖瑶摇尧遥窑谣姚咬舀药要耀椰噎耶爷野冶也页掖业叶曳腋夜液一壹医揖铱依伊衣颐夷遗移仪胰疑沂宜姨彝椅蚁倚已乙矣以艺抑易邑屹亿役臆逸肄疫亦裔意毅忆义益溢诣议谊译异翼翌绎茵荫因殷音阴姻吟银淫寅饮尹引隐印英樱婴鹰应缨莹萤营荧蝇迎赢盈影颖硬映哟拥佣臃痈庸雍踊蛹咏泳涌永恿勇用幽优悠忧尤由邮铀犹油游酉有友右佑釉诱又幼迂淤于盂榆虞愚舆余俞逾鱼愉渝渔隅予娱雨与屿禹宇语羽玉域芋郁吁遇喻峪御愈欲狱育誉浴寓裕预豫驭鸳渊冤元垣袁原援辕园员圆猿源缘远苑愿怨院曰约越跃岳粤月悦阅耘云郧匀陨允运蕴酝晕韵孕',
      'Z': '匝砸杂栽哉灾宰载再在咱攒暂赞赃脏葬遭糟凿藻枣早澡蚤躁噪造皂灶燥责择则泽贼怎增憎曾赠扎喳渣札轧铡闸眨栅榨咋乍炸诈摘斋宅窄债寨瞻毡詹粘沾盏斩辗崭展蘸栈占战站湛绽樟章彰漳张掌涨杖丈帐账仗胀瘴障招昭找沼赵照罩兆肇召遮折哲蛰辙者锗蔗这浙珍斟真甄砧臻贞针侦枕疹诊震振镇阵蒸挣睁征狰争怔整拯正政帧症郑证芝枝支吱蜘知肢脂汁之织职直植殖执值侄址指止趾只旨纸志挚掷至致置帜峙制智秩稚质炙痔滞治窒中盅忠钟衷终种肿重仲众舟周州洲诌粥轴肘帚咒皱宙昼骤珠株蛛朱猪诸诛逐竹烛煮拄瞩嘱主著柱助蛀贮铸筑住注祝驻抓爪拽专砖转撰赚篆桩庄装妆撞壮状椎锥追赘坠缀谆准捉拙卓桌琢茁酌着灼浊兹咨资姿滋淄孜紫仔籽滓子自渍字鬃棕踪宗综总纵邹走奏揍租足卒族祖诅阻组钻纂嘴醉最罪尊遵昨左佐柞做作座',

    }
    for (const initial in pinyinMap) {
      if (pinyinMap[initial].includes(firstChar)) return initial
    }
    return '#'
  }
  return '#'
}
function groupByPinyin(items: FriendItem[]): FriendGroup[] {
  const map = new Map<string, FriendItem[]>()
  items.forEach(item => {
    const name = item.remark || item.nickname || ''
    const initial = getPinyinInitial(name)
    if (!map.has(initial)) map.set(initial, [])
    map.get(initial)!.push(item)
  })
  // 排序：字母在前，#在后
  const letters = Array.from(map.keys()).sort((a, b) => {
    if (a === '#') return 1
    if (b === '#') return -1
    return a.localeCompare(b)
  })
  return letters.map(l => ({ letter: l, friends: map.get(l)! }))
}

// 搜索好友
async function openSearch() {
  showSearch.value = true
  searchKeyword.value = ''
  searchResults.value = []
}

function closeSearch() {
  showSearch.value = false
  searchKeyword.value = ''
  searchResults.value = []
}

function clearSearch() {
  searchKeyword.value = ''
  searchResults.value = []
}

// 搜索
let searchTimer: ReturnType<typeof setTimeout> | null = null

async function doSearch(keyword: string) {
  if (!keyword.trim()) {
    searchResults.value = []
    return
  }
  isSearching.value = true
  try {
    const data = await api.get('/im/search/friends', { keyword })
    searchResults.value = Array.isArray(data) ? data : []
  } catch {
    searchResults.value = []
  } finally {
    isSearching.value = false
  }
}

// 使用watch监听搜索
watch(searchKeyword, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!val.trim()) {
    searchResults.value = []
    return
  }
  searchTimer = setTimeout(() => doSearch(val), 300)
})

// 选择好友
function selectFriend(f: FriendItem) {
  selectedFriend.value = f
  showSearch.value = false
}

function friendAction(action: string) {
  if (!selectedFriend.value) return
  const uid = selectedFriend.value.id
  if (action === 'chat') {
    uni.navigateTo({ url: `/pages/im/chat?userId=${uid}` })
  } else {
    uni.navigateTo({ url: `/pages/user/profile?userId=${uid}` })
  }
  selectedFriend.value = null
}

// 字母索引滚动
function scrollToLetter(letter: string) {
  scrollIntoView.value = 'group-' + letter
  const idx = letterList.value.indexOf(letter)
  if (idx >= 0) activeIndex.value = idx
}

function onScroll(e: any) {
  // 滚动时更新activeIndex会触发大量计算，简化处理
}

function goAddFriend() {
  uni.navigateTo({ url: '/pages/im/add-friend' })
}
</script>

<style scoped>
.page { background: #F5F0E8; min-height: 100vh; display: flex; flex-direction: column; }

/* 导航 */
.nav {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: #fff; border-bottom: 1px solid #E5E1DB;
}
.nav-left { display: flex; align-items: center; gap: 10px; }
.nav-back { font-size: 22px; color: #2C2C2C; padding: 4px; }
.nav-title { font-size: 16px; font-weight: 500; color: #2C2C2C; }
.nav-right { display: flex; align-items: center; gap: 4px; }
.nav-btn { font-size: 18px; color: #999; padding: 6px; }

/* 主内容 */
.main-content { flex: 1; display: flex; overflow: hidden; position: relative; }
.scroll-list { flex: 1; overflow-y: auto; padding-right: 24px; }

/* 字母分组 */
.letter-group { }
.letter-header {
  padding: 6px 16px; background: #F5F0E8;
  position: sticky; top: 0; z-index: 1;
}
.letter-label { font-size: 13px; font-weight: 500; color: #999; }
.friends-wrap { background: #fff; }
.friend-item {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 16px; border-bottom: 1px solid #f5f0e8;
}
.friend-item:active { background: #F5F0E8; }

.friend-avatar-wrap { position: relative; flex-shrink: 0; }
.friend-avatar { width: 44px; height: 44px; border-radius: 50%; }
.online-dot {
  position: absolute; bottom: 0; right: 0;
  width: 10px; height: 10px; border-radius: 50%;
  background: #22c55e; border: 2px solid #fff;
}

.friend-info { flex: 1; min-width: 0; }
.friend-name { font-size: 15px; font-weight: 500; color: #2C2C2C; }
.friend-nickname { font-size: 12px; color: #999; margin-left: 4px; }
.friend-signature { font-size: 12px; color: #999; margin-top: 2px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.friend-active { font-size: 11px; color: #999; margin-top: 2px; display: block; }

/* 字母索引 */
.letter-index {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 24px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0;
  padding: 8px 0;
}
.index-letter {
  width: 20px; height: 18px; display: flex; align-items: center;
  justify-content: center; font-size: 10px; font-weight: 500;
  color: #999; transition: all 0.15s;
}
.index-letter.active {
  color: #C41E3A; background: rgba(196,30,58,0.08);
  border-radius: 50%; font-weight: 600;
}

/* 搜索弹层 */
.sheet-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 100; display: flex;
}
.sheet-content { background: #fff; }
.sheet-full { width: 100%; height: 100%; overflow-y: auto; }
.sheet-bottom {
  margin-top: auto; border-radius: 16px 16px 0 0;
  padding-bottom: env(safe-area-inset-bottom);
}

.search-header { padding: 16px 16px 8px; background: #fff; }
.search-header-title { font-size: 17px; font-weight: 600; color: #2C2C2C; }
.search-body { padding: 12px 16px; }
.search-input-wrap { position: relative; }
.search-input {
  background: #F5F0E8; border-radius: 20px; padding: 10px 32px 10px 36px;
  font-size: 14px; width: 100%; box-sizing: border-box;
}
.search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #999; }
.search-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 14px; color: #999; padding: 4px; }
.search-results { margin-top: 12px; }
.search-status { text-align: center; padding: 32px 16px; font-size: 14px; color: #999; }
.search-list { }

/* 好友资料弹窗 */
.friend-profile { display: flex; align-items: center; gap: 16px; padding: 20px 20px 12px; }
.friend-avatar-big-wrap { position: relative; flex-shrink: 0; }
.friend-avatar-big { width: 64px; height: 64px; border-radius: 50%; }
.online-dot-lg {
  position: absolute; bottom: 0; right: 0;
  width: 14px; height: 14px; border-radius: 50%;
  background: #22c55e; border: 2px solid #fff;
}
.friend-detail { flex: 1; }
.friend-detail-name { font-size: 18px; font-weight: 600; color: #2C2C2C; display: block; }
.friend-detail-sub { font-size: 13px; color: #999; display: block; margin-top: 2px; }
.friend-detail-signature { font-size: 13px; color: #666; display: block; margin-top: 4px; }
.friend-detail-status { font-size: 12px; color: #999; display: block; margin-top: 4px; }
.friend-detail-status.online { color: #22c55e; font-weight: 500; }

.action-row { display: flex; gap: 12px; padding: 8px 20px 20px; }
.action-btn {
  flex: 1; display: flex; align-items: center; justify-content: center;
  gap: 6px; padding: 12px; border-radius: 8px; font-size: 14px; font-weight: 500;
}
.action-btn-primary { background: #C41E3A; color: #fff; }
.action-btn-outline { background: #F5F0E8; color: #2C2C2C; }
.action-btn:active { opacity: 0.8; }
</style>

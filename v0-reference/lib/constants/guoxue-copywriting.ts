/**
 * 热卜国学平台 - 国学韵味文案库
 * 
 * 设计原则：
 * 1. 引经据典，有文化底蕴
 * 2. 雅俗共赏，不晦涩难懂
 * 3. 场景贴切，自然不生硬
 * 4. 温暖鼓励，不冷漠说教
 */

// ===== 空状态文案 =====
export const EMPTY_STATE_COPY = {
  // 通用
  default: {
    title: "此处尚无内容",
    subtitle: "千里之行，始于足下",
  },
  
  // 课程相关
  course: {
    title: "学海待启航",
    subtitle: "书山有路勤为径，学海无涯苦作舟",
    action: "探索课程",
  },
  myCourse: {
    title: "尚未开启求学之旅",
    subtitle: "玉不琢，不成器；人不学，不知道",
    action: "去选课",
  },
  courseProgress: {
    title: "学业未启",
    subtitle: "千里之行，始于足下",
    action: "开始学习",
  },
  
  // 圈子相关
  circle: {
    title: "尚未入门",
    subtitle: "独学而无友，则孤陋而寡闻",
    action: "发现圈子",
  },
  myCircle: {
    title: "静待知音",
    subtitle: "三人行，必有我师焉",
    action: "加入圈子",
  },
  circlePost: {
    title: "此间暂无新语",
    subtitle: "抛砖引玉，期待高论",
    action: "发布动态",
  },
  
  // 收藏相关
  favorite: {
    title: "珍藏阁空空",
    subtitle: "藏书万卷，学问自成",
    action: "去发现",
  },
  bookmark: {
    title: "书签夹尚空",
    subtitle: "好记性不如烂笔头",
    action: "去标记",
  },
  
  // 消息相关
  message: {
    title: "鸿雁未至",
    subtitle: "鸿雁传书，静候佳音",
  },
  notification: {
    title: "暂无新讯",
    subtitle: "风平浪静，岁月安好",
  },
  comment: {
    title: "高山流水待知音",
    subtitle: "期待您的真知灼见",
    action: "抢先评论",
  },
  
  // 订单相关
  order: {
    title: "尚无交易",
    subtitle: "千金难买心头好",
    action: "去逛逛",
  },
  cart: {
    title: "锦囊空空",
    subtitle: "货比三家，择优而购",
    action: "去选购",
  },
  
  // 搜索相关
  search: {
    title: "踏破铁鞋无觅处",
    subtitle: "换个关键词，或许柳暗花明",
    action: "重新搜索",
  },
  
  // 历史记录
  history: {
    title: "白纸一张",
    subtitle: "读万卷书，行万里路",
    action: "去探索",
  },
  
  // 笔记相关
  note: {
    title: "笔墨未动",
    subtitle: "不动笔墨不读书",
    action: "记笔记",
  },
  
  // 关注/粉丝
  following: {
    title: "尚未关注他人",
    subtitle: "见贤思齐焉",
    action: "去关注",
  },
  follower: {
    title: "静待知音来",
    subtitle: "酒香不怕巷子深",
  },
  
  // 活动相关
  activity: {
    title: "暂无活动",
    subtitle: "静待良辰，共襄盛举",
    action: "查看更多",
  },
  
  // 直播相关
  live: {
    title: "此刻无直播",
    subtitle: "台上一分钟，台下十年功",
    action: "预约直播",
  },
  
  // 问答相关
  question: {
    title: "尚无疑问",
    subtitle: "学而不思则罔，思而不学则殆",
    action: "提个问题",
  },
  answer: {
    title: "静待高人指点",
    subtitle: "听君一席话，胜读十年书",
    action: "我来解答",
  },
  
  // 商品相关
  product: {
    title: "此处暂无宝物",
    subtitle: "千淘万漉虽辛苦，吹尽狂沙始到金",
    action: "去发现",
  },
  
  // 文章/内容
  article: {
    title: "墨香未至",
    subtitle: "笔落惊风雨，诗成泣鬼神",
    action: "去阅读",
  },
  
  // 电子书
  ebook: {
    title: "书架空空",
    subtitle: "书中自有黄金屋",
    action: "去书城",
  },
  
  // 研究院
  institute: {
    title: "学堂虚位以待",
    subtitle: "青青子衿，悠悠我心",
    action: "了解更多",
  },
  
  // 网络错误
  networkError: {
    title: "山高路远",
    subtitle: "网络不通，稍后再试",
    action: "重新加载",
  },
  
  // 无权限
  noPermission: {
    title: "此门暂不通行",
    subtitle: "登堂入室，需先入门",
    action: "去解锁",
  },
}

// ===== 操作反馈文案 =====
export const FEEDBACK_COPY = {
  // 成功
  success: {
    default: "善哉善哉",
    save: "已妥善收藏",
    submit: "呈文已递",
    purchase: "交易达成",
    join: "入门礼成",
    follow: "已添关注",
    like: "心有灵犀",
    share: "广结善缘",
    comment: "高见已录",
    publish: "文章已发",
    payment: "银货两讫",
  },
  
  // 错误
  error: {
    default: "事与愿违",
    network: "山高路远，通讯受阻",
    server: "后堂暂歇，稍后再试",
    timeout: "良辰已过，请重试",
    validation: "信息有误，请核实",
    permission: "权限不足，无法通行",
  },
  
  // 警告
  warning: {
    default: "请三思而行",
    unsaved: "笔墨未干，确定离开？",
    delete: "覆水难收，确定删除？",
    exit: "学业未竟，确定退出？",
  },
  
  // 加载
  loading: {
    default: "稍候片刻...",
    data: "正在整理卷宗...",
    image: "画卷徐徐展开...",
    video: "影像即将呈现...",
    submit: "正在呈递...",
    payment: "银钱交接中...",
  },
}

// ===== 按钮文案 =====
export const BUTTON_COPY = {
  confirm: "确定",
  cancel: "取消",
  submit: "提交",
  save: "保存",
  delete: "删除",
  edit: "编辑",
  view: "查看",
  more: "更多",
  back: "返回",
  next: "下一步",
  prev: "上一步",
  finish: "完成",
  retry: "重试",
  refresh: "刷新",
  close: "关闭",
  
  // 国学风格按钮
  guoxue: {
    enter: "入门",
    exit: "告辞",
    join: "拜入",
    leave: "辞别",
    buy: "纳入囊中",
    subscribe: "订阅",
    follow: "关注",
    unfollow: "取消关注",
    like: "点赞",
    collect: "收藏",
    share: "分享",
    comment: "留言",
    reply: "回复",
    report: "举报",
    apply: "申请",
    invite: "邀请",
  },
}

// ===== 时间相关文案 =====
export const TIME_COPY = {
  justNow: "方才",
  minutesAgo: (n: number) => `${n}刻前`,
  hoursAgo: (n: number) => `${n}时辰前`,
  daysAgo: (n: number) => n === 1 ? "昨日" : `${n}日前`,
  weeksAgo: (n: number) => `${n}周前`,
  monthsAgo: (n: number) => `${n}月前`,
  yearsAgo: (n: number) => `${n}年前`,
  
  // 标准格式
  standard: {
    justNow: "刚刚",
    minutesAgo: (n: number) => `${n}分钟前`,
    hoursAgo: (n: number) => `${n}小时前`,
    daysAgo: (n: number) => `${n}天前`,
  },
}

// ===== 欢迎语/问候语 =====
export const GREETING_COPY = {
  morning: "晨起读书，神清气爽",
  noon: "午后小憩，养精蓄锐",
  afternoon: "下午茶时，品味经典",
  evening: "华灯初上，静心研读",
  night: "夜深人静，正宜苦读",
  
  // 根据时间获取问候语
  getByHour: (hour: number) => {
    if (hour >= 5 && hour < 9) return GREETING_COPY.morning
    if (hour >= 9 && hour < 12) return "上午好，求知若渴"
    if (hour >= 12 && hour < 14) return GREETING_COPY.noon
    if (hour >= 14 && hour < 17) return GREETING_COPY.afternoon
    if (hour >= 17 && hour < 19) return GREETING_COPY.evening
    return GREETING_COPY.night
  },
}

// ===== 成就/里程碑文案 =====
export const ACHIEVEMENT_COPY = {
  firstLogin: {
    title: "初入山门",
    desc: "欢迎来到国学世界",
  },
  firstCourse: {
    title: "开卷有益",
    desc: "完成第一节课程学习",
  },
  firstCircle: {
    title: "志同道合",
    desc: "加入第一个学习圈子",
  },
  firstNote: {
    title: "笔耕不辍",
    desc: "写下第一篇学习笔记",
  },
  firstShare: {
    title: "桃李满门",
    desc: "首次分享内容给好友",
  },
  streak7: {
    title: "持之以恒",
    desc: "连续学习7天",
  },
  streak30: {
    title: "铁杵磨针",
    desc: "连续学习30天",
  },
  streak100: {
    title: "滴水穿石",
    desc: "连续学习100天",
  },
  courseComplete10: {
    title: "博览群书",
    desc: "完成10门课程学习",
  },
  courseComplete50: {
    title: "学富五车",
    desc: "完成50门课程学习",
  },
  courseComplete100: {
    title: "汗牛充栋",
    desc: "完成100门课程学习",
  },
}

// ===== 仪式感文案 =====
export const CEREMONY_COPY = {
  // 加入圈子
  joinCircle: {
    applying: "递上拜帖，恭候回音",
    approved: "礼成，欢迎入门",
    welcome: "恭迎新友入门，愿共勉之",
  },
  
  // 完成课程
  completeCourse: {
    congrats: "恭喜完成学业",
    certificate: "特此颁发结业证书",
    encourage: "学无止境，更上层楼",
  },
  
  // 获得徽章
  getBadge: {
    unlock: "恭喜解锁新成就",
    collect: "已收入锦囊",
  },
  
  // 升级
  levelUp: {
    congrats: "道行精进，更上一层",
    newLevel: "已晋升为",
  },
}

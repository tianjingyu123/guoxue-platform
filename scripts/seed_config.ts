import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const configs: { key: string; value: any; desc: string }[] = [
    {
      key: "category_tag_tree",
      value: {
        "国学经典": ["儒家经典","道家典籍","佛学经典","诸子百家"],
        "中医养生": ["中医基础","食疗药膳","经络穴位","四季养生"],
        "诗词歌赋": ["唐诗","宋词","元曲","现代诗词创作"],
        "民俗节庆": ["传统节日","民俗活动","民间故事","礼仪习俗"],
        "非遗传承": ["传统技艺","传统美术","传统音乐","民俗活动"],
        "茶道香道": ["茶道文化","香道文化","茶具鉴赏","品茶技法"],
        "书法绘画": ["书法入门","国画技法","名家鉴赏","篆刻艺术"],
        "传统音乐": ["古琴","古筝","琵琶","二胡"],
        "武术太极": ["太极拳","八段锦","武术基础","养生气功"],
        "易经智慧": ["八字命理","紫微斗数","风水堪舆","姓名学"]
      },
      desc: "平台品类标签树"
    },
    {
      key: "ai_model_routing",
      value: {
        default: { model: "deepseek-v4-flash", fallbackModel: "deepseek-v3", temperature: 0.3, maxTokens: 2048, topP: 0.9 },
        scenes: {
          circle_assistant: { model: "deepseek-v4-pro", fallbackModel: "deepseek-v3", temperature: 0.3, maxTokens: 2048, budgetControl: { monthlyTokenLimit: 5000000, lightModel: "deepseek-v4-flash" } },
          customer_service: { model: "deepseek-v4-pro", fallbackModel: "doubao-pro", temperature: 0.3, maxTokens: 1024, budgetControl: { monthlyTokenLimit: 2000000, lightModel: "deepseek-v4-flash" } },
          smart_search: { model: "deepseek-v4-pro", fallbackModel: "deepseek-v3", temperature: 0.3, maxTokens: 2048 },
          content_generation: { model: "deepseek-v4-pro", fallbackModel: "deepseek-v3", temperature: 0.7, maxTokens: 2048, budgetControl: { monthlyTokenLimit: 3000000, lightModel: "deepseek-v4-flash" } },
          robot_comment: { model: "deepseek-v4-flash", temperature: 0.9, maxTokens: 150 },
          ai_cover_image: { model: "tongyi-wanxiang-v2", fallbackModel: "wenxin-yige" },
          ai_content_audit: { model: "deepseek-multimodal", fallbackModel: "gpt-5-vision" },
          ai_voice_to_text: { model: "tencent-asr", fallbackModel: "whisper-large" },
          ai_text_to_voice: { model: "tencent-tts", fallbackModel: "aliyun-tts" }
        }
      },
      desc: "AI模型路由配置"
    },
    {
      key: "operation_robots",
      value: {
        like_bot: { name: "内容点赞助手", enabled: true, frequency: "medium", description: "对新内容自动点赞" },
        comment_bot: { name: "评论互动助手", enabled: true, frequency: "low", description: "对热门内容生成AI评论" },
        signin_bot: { name: "圈子签到助手", enabled: true, frequency: "low", description: "在低活跃度圈子发布话题帖" },
        question_bot: { name: "问题提问助手", enabled: false, frequency: "low", description: "在付费问答板块提出高质量问题" }
      },
      desc: "虚拟运营机器人配置"
    },
    {
      key: "homepage_recommendations",
      value: { date: "", contentIds: [] },
      desc: "首页今日推荐"
    },
    {
      key: "hot_content_pool",
      value: { updatedAt: "", contentIds: [] },
      desc: "热门内容推荐池"
    }
  ];

  for (const c of configs) {
    await prisma.configSystem.upsert({
      where: { configKey: c.key },
      create: { configKey: c.key, configValue: JSON.stringify(c.value), description: c.desc },
      update: { configValue: JSON.stringify(c.value), description: c.desc }
    });
    console.log(`✅ ${c.key}`);
  }
  console.log("种子配置写入完成");
}

main().catch(console.error).finally(() => prisma.$disconnect());

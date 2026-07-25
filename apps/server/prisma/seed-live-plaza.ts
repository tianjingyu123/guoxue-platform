/**
 * 直播广场展示种子
 *
 * 目标：
 * - 为“全部 / 知识授课 / 电商带货”提供直播中、预告、回放三种状态；
 * - 仅创建展示所需的房间、主播和商品关联，不生成订单、成交额、礼物等经营数据；
 * - 固定 ID + upsert，重复执行不会重复堆积数据。
 *
 * 预演：pnpm --filter @guoxue/server seed:live-plaza -- --dry-run
 * 执行：pnpm --filter @guoxue/server seed:live-plaza
 */
import {
  LiveHostType,
  LiveStatus,
  Prisma,
  PrismaClient,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const isDryRun = process.argv.includes("--dry-run");

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const REPLAY_URL = "https://player.alicdn.com/video/aliyunmedia.mp4";

const hosts = [
  {
    id: "7b240000-0000-4000-8000-000000000001",
    nickname: "国学公开课",
    avatar: "https://api.rebugx.cn/assets/experts/expert-1.webp",
    bio: "平台国学知识公开课主讲团队",
  },
  {
    id: "7b240000-0000-4000-8000-000000000002",
    nickname: "文房雅集",
    avatar: "https://api.rebugx.cn/assets/experts/expert-2.webp",
    bio: "分享文房器物、传统雅生活与使用方法",
  },
  {
    id: "7b240000-0000-4000-8000-000000000003",
    nickname: "节气养生堂",
    avatar: "https://api.rebugx.cn/assets/live/live-h1.webp",
    bio: "讲解节气文化与日常养生常识",
  },
] as const;

type RoomSeed = {
  id: string;
  hostId: string;
  title: string;
  description: string;
  cover: string;
  status: LiveStatus;
  orientation: "portrait" | "landscape";
  viewCount: number;
  startTime: Date;
  endTime: Date | null;
  replayUrl: string | null;
  replayVisibility: "CIRCLE_ONLY" | "PLATFORM";
  replayChapters: Prisma.InputJsonValue | null;
  productCount: number;
};

function createRooms(now: Date): RoomSeed[] {
  return [
    {
      id: "7b240001-0000-4000-8000-000000000001",
      hostId: hosts[0].id,
      title: "周易六十四卦·乾坤入门公开课",
      description: "从卦象结构、阴阳变化到生活应用，带你建立清晰的《周易》入门框架。",
      cover: "https://api.rebugx.cn/assets/live/live-1.webp",
      status: LiveStatus.LIVING,
      orientation: "landscape",
      viewCount: 36,
      startTime: new Date(now.getTime() - 35 * 60 * 1000),
      endTime: null,
      replayUrl: null,
      replayVisibility: "CIRCLE_ONLY",
      replayChapters: null,
      productCount: 0,
    },
    {
      id: "7b240001-0000-4000-8000-000000000002",
      hostId: hosts[1].id,
      title: "文房雅器甄选·砚墨纸笔专场",
      description: "边讲边看文房器物的材质、工艺与使用场景，理性选购适合自己的雅物。",
      cover: "https://api.rebugx.cn/assets/live/live-2.webp",
      status: LiveStatus.LIVING,
      orientation: "portrait",
      viewCount: 18,
      startTime: new Date(now.getTime() - 18 * 60 * 1000),
      endTime: null,
      replayUrl: null,
      replayVisibility: "CIRCLE_ONLY",
      replayChapters: null,
      productCount: 3,
    },
    {
      id: "7b240001-0000-4000-8000-000000000003",
      hostId: hosts[0].id,
      title: "紫微斗数十二宫基础讲解",
      description: "认识十二宫位的基本含义与阅读顺序，适合刚开始接触紫微斗数的学习者。",
      cover: "https://api.rebugx.cn/assets/live/live-3.webp",
      status: LiveStatus.WAITING,
      orientation: "landscape",
      viewCount: 0,
      startTime: new Date(now.getTime() + 3 * HOUR),
      endTime: null,
      replayUrl: null,
      replayVisibility: "CIRCLE_ONLY",
      replayChapters: null,
      productCount: 0,
    },
    {
      id: "7b240001-0000-4000-8000-000000000004",
      hostId: hosts[1].id,
      title: "国学经典听读设备体验专场",
      description: "现场演示经典听读、章节检索与长辈模式，讲清功能差异和适用人群。",
      cover: "https://api.rebugx.cn/assets/live/live-h1.webp",
      status: LiveStatus.WAITING,
      orientation: "portrait",
      viewCount: 0,
      startTime: new Date(now.getTime() + DAY + 2 * HOUR),
      endTime: null,
      replayUrl: null,
      replayVisibility: "CIRCLE_ONLY",
      replayChapters: null,
      productCount: 2,
    },
    {
      id: "7b240001-0000-4000-8000-000000000005",
      hostId: hosts[2].id,
      title: "小暑到大暑·夏季养心公开课",
      description: "结合节气特点讲解作息、饮食与情志调养，内容仅作传统文化与生活常识分享。",
      cover: "https://api.rebugx.cn/assets/live/live-2.webp",
      status: LiveStatus.WAITING,
      orientation: "landscape",
      viewCount: 0,
      startTime: new Date(now.getTime() + 2 * DAY + HOUR),
      endTime: null,
      replayUrl: null,
      replayVisibility: "CIRCLE_ONLY",
      replayChapters: null,
      productCount: 0,
    },
    {
      id: "7b240001-0000-4000-8000-000000000006",
      hostId: hosts[2].id,
      title: "二十四节气与夏季养心",
      description: "回顾夏季节气的文化源流与日常调养要点，附分段章节，方便按主题观看。",
      cover: "https://api.rebugx.cn/assets/live/live-3.webp",
      status: LiveStatus.REPLAY,
      orientation: "landscape",
      viewCount: 128,
      startTime: new Date(now.getTime() - 3 * DAY),
      endTime: new Date(now.getTime() - 3 * DAY + 68 * 60 * 1000),
      replayUrl: REPLAY_URL,
      replayVisibility: "PLATFORM",
      replayChapters: [
        { t: 0, title: "节气文化导读" },
        { t: 620, title: "夏季作息要点" },
        { t: 1510, title: "饮食与情志调养" },
      ],
      productCount: 0,
    },
    {
      id: "7b240001-0000-4000-8000-000000000007",
      hostId: hosts[0].id,
      title: "《论语》中的修身次第",
      description: "从学而、为政到里仁，串联经典原文与现代生活中的自我修养。",
      cover: "https://api.rebugx.cn/assets/live/live-1.webp",
      status: LiveStatus.REPLAY,
      orientation: "landscape",
      viewCount: 96,
      startTime: new Date(now.getTime() - 6 * DAY),
      endTime: new Date(now.getTime() - 6 * DAY + 54 * 60 * 1000),
      replayUrl: REPLAY_URL,
      replayVisibility: "PLATFORM",
      replayChapters: [
        { t: 0, title: "为何重读《论语》" },
        { t: 780, title: "从学习到自省" },
        { t: 1620, title: "修身如何落到日常" },
      ],
      productCount: 0,
    },
    {
      id: "7b240001-0000-4000-8000-000000000008",
      hostId: hosts[1].id,
      title: "文房清供搭配与使用",
      description: "从书写、阅读与桌面陈设三个场景，介绍常见文房器物的搭配和养护方法。",
      cover: "https://api.rebugx.cn/assets/live/live-h1.webp",
      status: LiveStatus.REPLAY,
      orientation: "portrait",
      viewCount: 74,
      startTime: new Date(now.getTime() - 9 * DAY),
      endTime: new Date(now.getTime() - 9 * DAY + 47 * 60 * 1000),
      replayUrl: REPLAY_URL,
      replayVisibility: "PLATFORM",
      replayChapters: [
        { t: 0, title: "认识基础文房器物" },
        { t: 540, title: "书写场景搭配" },
        { t: 1280, title: "日常养护与收纳" },
      ],
      productCount: 2,
    },
  ];
}

async function main() {
  const now = new Date();
  const rooms = createRooms(now);
  const products = await prisma.product.findMany({
    where: { status: "ON_SALE", deletedAt: null },
    orderBy: [{ salesCount: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true },
    take: 6,
  });

  if (products.length < 3) {
    throw new Error(`直播带货种子至少需要 3 个在售商品，当前仅找到 ${products.length} 个`);
  }

  console.log(`模式：${isDryRun ? "只读预演" : "正式写入"}`);
  console.log(`主播：${hosts.map((host) => host.nickname).join("、")}`);
  console.log(`在售商品：${products.map((product) => product.title).join("、")}`);
  console.table(
    rooms.map((room) => ({
      状态: room.status,
      类型: room.productCount > 0 ? "电商带货" : "知识授课",
      标题: room.title,
      商品数: room.productCount,
    })),
  );

  if (isDryRun) {
    console.log("预演完成：未写入任何数据。");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const host of hosts) {
      await tx.user.upsert({
        where: { id: host.id },
        create: {
          ...host,
          status: UserStatus.ACTIVE,
          attributionSource: "PLATFORM",
        },
        update: {
          nickname: host.nickname,
          avatar: host.avatar,
          bio: host.bio,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
      });
    }

    for (const room of rooms) {
      const roomData = {
        circleId: null,
        stationId: null,
        userId: room.hostId,
        hostUserId: room.hostId,
        title: room.title,
        cover: room.cover,
        hostType: LiveHostType.STATION_MASTER,
        coHostIds: [],
        status: room.status,
        quality: "hd",
        orientation: room.orientation,
        viewCount: room.viewCount,
        chargeType: "FREE",
        chargePrice: null,
        startTime: room.startTime,
        endTime: room.endTime,
        replayUrl: room.replayUrl,
        auditStatus: "APPROVED",
        auditReason: null,
        visibility: "PLATFORM",
        replayVisibility: room.replayVisibility,
        replayCharge: false,
        replayChapters: room.replayChapters ?? Prisma.JsonNull,
      };

      await tx.liveRoom.upsert({
        where: { id: room.id },
        create: { id: room.id, ...roomData },
        update: roomData,
      });

      // 兼容生产机迁移后、Prisma Client 尚未重新生成的短暂窗口。
      await tx.$executeRaw`
        UPDATE "LiveRoom"
        SET "description" = ${room.description}
        WHERE "id" = ${room.id}
      `;

      await tx.liveProduct.deleteMany({ where: { liveId: room.id } });
      for (const [index, product] of products.slice(0, room.productCount).entries()) {
        await tx.liveProduct.create({
          data: {
            liveId: room.id,
            productId: product.id,
            sortOrder: index,
          },
        });
      }
    }
  });

  console.log(`直播广场种子写入完成：${rooms.length} 个房间，${hosts.length} 位主播。`);
}

main()
  .catch((error) => {
    console.error("直播广场种子执行失败：", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

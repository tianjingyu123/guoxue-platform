import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class ShareService {
  constructor(private prisma: PrismaService) {}

  async getShareConfig(type: string, id: string) {
    const miniApps = await this.prisma.miniAppConfig.findMany({ where: { isActive: true } });
    const mainApp = miniApps.find(m => m.type === "MAIN") || miniApps[0];

    switch (type) {
      case "course": {
        const course = await this.prisma.course.findUnique({
          where: { id },
          select: { title: true, cover: true, intro: true },
        });
        if (!course) break;
        return {
          title: course.title,
          desc: course.intro || course.title,
          image: course.cover,
          miniPath: `/pages/course/detail?id=${id}`,
          h5Url: `${process.env.H5_BASE_URL || ""}/course/${id}`,
          appId: mainApp?.appId,
        };
      }
      case "article": {
        const article = await this.prisma.article.findUnique({
          where: { id },
          select: { title: true, cover: true, content: true },
        });
        if (!article) break;
        return {
          title: article.title,
          desc: article.content?.substring(0, 100) || article.title,
          image: article.cover,
          miniPath: `/pages/article/detail?id=${id}`,
          h5Url: `${process.env.H5_BASE_URL || ""}/article/${id}`,
          appId: mainApp?.appId,
        };
      }
      case "live": {
        return {
          title: "直播分享",
          desc: "精彩直播正在进行",
          miniPath: `/pages/live/room?id=${id}`,
          h5Url: `${process.env.H5_BASE_URL || ""}/live/${id}`,
          appId: mainApp?.appId,
        };
      }
      case "bounty": {
        const bounty = await this.prisma.bountyQuestion.findUnique({
          where: { id },
          select: { title: true, description: true },
        });
        if (!bounty) break;
        return {
          title: bounty.title,
          desc: bounty.description || bounty.title,
          miniPath: `/pages/bounty/detail?id=${id}`,
          h5Url: `${process.env.H5_BASE_URL || ""}/bounty/${id}`,
          appId: mainApp?.appId,
        };
      }
    }
    return { title: "国学传统文化", desc: "传承千年智慧", miniPath: "/pages/index/index", h5Url: process.env.H5_BASE_URL || "", appId: mainApp?.appId };
  }
}

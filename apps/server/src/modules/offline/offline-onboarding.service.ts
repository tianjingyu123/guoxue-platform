import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";

/** 有效报名状态（与仪表盘学员归属同口径）：已报名 / 已签到；CANCELLED 不算 */
const VALID_REG_STATUS = ["REGISTERED", "SIGNED_IN"];
/** 「已举办活动」口径：已发布或已结束（草稿/已取消不算举办） */
const HELD_EVENT_STATUS = ["PUBLISHED", "FINISHED"];

/** 单个开业清单项：done=null 表示无法自动检测（前端渲染为引导项而非勾选项） */
export interface OnboardingItem {
  key: string;
  title: string;
  done: boolean | null;
}

export interface OnboardingStage {
  key: string;
  title: string;
  items: OnboardingItem[];
}

/**
 * 驿站开业 SOP 进度（T8-P1b 加盟 SOP 支持系统）
 * 阶段清单硬编码在本 service（YAGNI：不建新表，全部 done 判定由现有业务数据实时推导）。
 * 与 advisor offline_onboarding 探针共享同一套口径（有效报名/已举办活动）。
 */
@Injectable()
export class OfflineOnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getOnboarding(stationId: string) {
    const station = await this.prisma.stationOffline.findUnique({
      where: { id: stationId },
      select: { name: true, intro: true, images: true, createdAt: true },
    });
    if (!station) throw new BusinessException(ErrorCode.NOT_FOUND, "驿站不存在");

    const [
      teacherCount,
      publishedCourseCount,
      productCount,
      registrationCount,
      heldEventCount,
      circleLinkedCourseCount,
      reviewCount,
      distinctStudents,
    ] = await Promise.all([
      this.prisma.stationTeacher.count({ where: { stationId, status: "ACTIVE" } }),
      this.prisma.offlineCourse.count({ where: { stationId, status: "PUBLISHED" } }),
      this.prisma.stationProduct.count({ where: { stationId, status: "ACTIVE" } }),
      this.prisma.offlineCourseRegistration.count({
        where: { course: { stationId }, status: { in: VALID_REG_STATUS } },
      }),
      this.prisma.stationEvent.count({ where: { stationId, status: { in: HELD_EVENT_STATUS } } }),
      this.prisma.offlineCourse.count({ where: { stationId, circleId: { not: null } } }),
      this.prisma.offlineCourseReview.count({ where: { stationId } }),
      this.prisma.offlineCourseRegistration.groupBy({
        by: ["userId"],
        where: { course: { stationId }, status: { in: VALID_REG_STATUS } },
      }),
    ]);

    // 资料完善判定：简介 + 图集均非空（营业时间/设施可选，不做硬卡点）
    const profileDone = !!(station.intro && station.intro.trim().length > 0) && station.images.length > 0;
    const studentCount = distinctStudents.length;

    const stages: OnboardingStage[] = [
      {
        key: "setup",
        title: "基础建站",
        items: [
          { key: "profile", title: "完善驿站资料（简介/照片/设施/营业时间）", done: profileDone },
          { key: "teacher", title: "添加首位讲师", done: teacherCount > 0 },
          { key: "course", title: "发布首个课程", done: publishedCourseCount > 0 },
          { key: "product", title: "上架首个商品", done: productCount > 0 },
        ],
      },
      {
        key: "operate",
        title: "运营起步",
        items: [
          { key: "registration", title: "获得首个报名", done: registrationCount > 0 },
          { key: "event", title: "举办首场活动", done: heldEventCount > 0 },
          { key: "circle", title: "建立首个同学圈", done: circleLinkedCourseCount > 0 },
          { key: "review", title: "收获首条评价", done: reviewCount > 0 },
        ],
      },
      {
        key: "growth",
        title: "增长进阶",
        items: [
          // 站外分享无法可靠检测 → done=null，前端显示为引导项（不计入进度分母）
          { key: "share", title: "分享驿站主页获客", done: null },
          { key: "students10", title: "累计服务 10 位学员", done: studentCount >= 10 },
          { key: "event3", title: "举办 3 场活动", done: heldEventCount >= 3 },
        ],
      },
    ];

    const checkable = stages.flatMap((s) => s.items).filter((i) => i.done !== null);
    const progress = {
      done: checkable.filter((i) => i.done === true).length,
      total: checkable.length,
    };
    const openDays = Math.max(0, Math.floor((Date.now() - station.createdAt.getTime()) / 86_400_000));

    return { stationName: station.name, openDays, stages, progress };
  }
}

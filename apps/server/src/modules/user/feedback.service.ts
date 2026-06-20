import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async getFeedbackTypes() {
    const types = [
      { id: "bug", label: "问题反馈", icon: "bug", color: "#ff4d4f", bgColor: "rgba(255,77,79,0.1)" },
      { id: "suggestion", label: "功能建议", icon: "lightbulb", color: "#f59e0b", bgColor: "rgba(245,158,11,0.1)" },
      { id: "complaint", label: "投诉举报", icon: "alert-triangle", color: "#f97316", bgColor: "rgba(249,115,22,0.1)" },
      { id: "other", label: "其他问题", icon: "help-circle", color: "#3b82f6", bgColor: "rgba(59,130,246,0.1)" },
    ];
    const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: "待处理", color: "#d48806", bg: "rgba(245,158,11,0.1)" },
      processing: { label: "处理中", color: "#2563eb", bg: "rgba(59,130,246,0.1)" },
      resolved: { label: "已解决", color: "#16a34a", bg: "rgba(34,197,94,0.1)" },
    };
    return { types, statusConfig };
  }

  async getHistoryFeedbacks(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, content: true, images: true, status: true, createdAt: true },
    });
  }

  async submitFeedback(userId: string, data: { type: string; content: string; contact?: string; images?: string[] }) {
    const fb = await this.prisma.feedback.create({
      data: {
        userId,
        type: data.type,
        content: data.content,
        contact: data.contact,
        images: data.images ?? [],
      },
      select: { id: true, status: true, createdAt: true },
    });
    return { success: true, id: fb.id, status: fb.status };
  }
}

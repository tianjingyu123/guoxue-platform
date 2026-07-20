import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { Request } from "express";
import { PointsService } from "./points.service";
import { InteractionService } from "../interaction/interaction.service";
import { CommentService } from "../comment/comment.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { ThrottleGuard } from "../../common/throttle.guard";
import { BusinessException } from "../../common/business.exception";
import { ErrorCode } from "../../common/error-codes";
import { ContentExpService } from "../user-growth/content-exp.service";

/**
 * 创作榜（创-P1 创作激励）：公开端点 GET /users/creation-rankings。
 * 路由侦察结论：UserController 的 GET users/:id 通配路由会遮蔽同前缀静态段，而 UserModule 在
 * app.module 中先于 UserGrowthModule 注册——挂 user-growth 侧必被遮蔽。故挂在本文件（points controller 侧），
 * 并在 user.module 控制器数组中置于 UserController 之前，确保静态路由先注册。
 */
@ApiTags("成长体系")
@Controller("users")
export class CreationRankingsController {
  constructor(private readonly contentExp: ContentExpService) {}

  @Get("creation-rankings")
  @UseGuards(ThrottleGuard)
  @ApiOperation({ summary: "创作榜（周/月·质量加权内容学分 Top20·公开）" })
  @ApiQuery({ name: "period", required: false, description: "week(默认·近7天) | month(近30天)" })
  @ApiResponse({ status: 200, description: "成功" })
  creationRankings(@Query("period") period?: string) {
    return this.contentExp.getCreationRankings(period === "month" ? "month" : "week");
  }
}

@ApiTags("积分成长")
@Controller("users/me")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PointsController {
  constructor(
    private readonly svc: PointsService,
    private readonly interaction: InteractionService,
    private readonly comment: CommentService,
  ) {}

  @Get("points")
  @ApiOperation({ summary: "积分余额+规则" })
  @ApiResponse({ status: 200, description: "成功" })
  getPoints(@Req() req: Request) {
    return this.svc.getPoints(req.user.id);
  }

  @Get("points/records")
  @ApiOperation({ summary: "积分明细" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getPointsRecords(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getPointsRecords(req.user.id, +page, +pageSize);
  }

  @Get("growth")
  @ApiOperation({ summary: "成长值+等级" })
  @ApiResponse({ status: 200, description: "成功" })
  getGrowth(@Req() req: Request) {
    return this.svc.getGrowth(req.user.id);
  }

  @Get("growth/records")
  @ApiOperation({ summary: "成长值明细" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getGrowthRecords(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.svc.getGrowthRecords(req.user.id, +page, +pageSize);
  }

  @Post("points/exchange")
  @ApiOperation({ summary: "积分兑换（兑换积分商城商品）" })
  @ApiResponse({ status: 201, description: "兑换成功" })
  @ApiResponse({ status: 400, description: "积分不足/已兑完/参数错误" })
  exchange(@Req() req: Request, @Body() dto: { productId: string }) {
    return this.svc.exchangeProduct(req.user.id, dto.productId);
  }

  @Get("points/products")
  @ApiOperation({ summary: "积分商城商品列表" })
  @ApiResponse({ status: 200, description: "成功" })
  getPointsProducts() {
    return this.svc.getProducts();
  }

  @Get("points/tasks")
  @ApiOperation({ summary: "积分任务列表（每日可做的赚积分任务）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getPointsTasks(@Req() req: Request) {
    // 上线阶段只展示已有真实积分写入链路的任务；完成态读取当天签到记录。
    const checkedIn = await this.svc.hasCheckedInToday(req.user.id);
    return this.getDefaultEarnRules().map((r, i) => ({
      id: i + 1,
      title: r.title,
      points: r.points,
      icon: r.icon,
      action: checkedIn ? "已完成" : "去签到",
      limit: r.limit,
      completed: checkedIn,
    }));
  }

  @Get("points/overview")
  @ApiOperation({ summary: "积分概览（积分+成长值+规则+等级）" })
  @ApiResponse({ status: 200, description: "成功" })
  async getPointsOverview(@Req() req: Request) {
    const [points, growth] = await Promise.all([
      this.svc.getPoints(req.user.id),
      this.svc.getGrowth(req.user.id),
    ]);
    return {
      pointsInfo: {
        balance: points.balance,
        todayEarned: 0,
        monthEarned: 0,
        totalEarned: points.totalEarned,
        expiringSoon: 0,
      },
      growthInfo: {
        value: growth.value,
        level: growth.level,
        levelName: this.getLevelName(growth.level),
        nextLevel: growth.level + 1,
        nextLevelName: this.getLevelName(growth.level + 1),
        nextLevelValue: growth.nextLevelValue,
        progress: growth.nextLevelValue > 0 ? Math.round((growth.value / growth.nextLevelValue) * 100) : 100,
      },
      earnRules: this.getDefaultEarnRules(),
      growthRules: this.getDefaultGrowthRules(),
      growthLevels: this.getDefaultGrowthLevels(),
    };
  }

  @Get("likes")
  @ApiOperation({ summary: "我的点赞列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getMyLikes(
    @Req() req: Request,
    @Query("type") type?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.interaction.getMyLikes(req.user.id, +page, +pageSize);
  }

  @Get("comments")
  @ApiOperation({ summary: "我的评论列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getMyComments(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.comment.getUserComments(req.user.id, +page, +pageSize);
  }

  @Get("received-comments")
  @ApiOperation({ summary: "收到的评论列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  async getReceivedComments(
    @Req() req: Request,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.comment.getReceivedComments(req.user.id, +page, +pageSize);
  }

  @Post("received-comments/:id/reply")
  @ApiOperation({ summary: "回复收到的评论" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "参数校验失败" })
  async replyToComment(
    @Req() req: Request,
    @Param("id") commentId: string,
    @Body() body: { content: string },
  ) {
    const parent = await this.comment.getCommentById(commentId);
    if (!parent) throw new BusinessException(ErrorCode.COMMENT_NOT_FOUND, "评论不存在");
    return this.comment.create(req.user.id, {
      targetType: parent.targetType,
      targetId: parent.targetId,
      parentId: commentId,
      content: body.content,
    });
  }

  private getLevelName(level: number): string {
    const names: Record<number, string> = {
      1: "青铜学员", 2: "白银学员", 3: "黄金学员",
      4: "金牌学员", 5: "钻石学员", 6: "至尊学员",
    };
    return names[level] || `Lv${level}`;
  }

  private getDefaultEarnRules() {
    return [
      { id: "1", title: "每日签到", description: "基础5积分，连续签到每3天提升一档", points: 5, icon: "calendar", limit: "基础5分起 · 每日1次" },
    ];
  }

  private getDefaultGrowthRules() {
    return [
      { icon: "shopping-bag", title: "购买课程", desc: "每消费10元获得10成长值", value: "+10/10元" },
      { icon: "book-open", title: "完成学习", desc: "完成课程章节学习", value: "+5/章节" },
      { icon: "star", title: "完成课程", desc: "完成整门课程学习", value: "+50/课程" },
      { icon: "message-circle", title: "互动参与", desc: "发表评论、参与讨论", value: "+2/次" },
      { icon: "trending-up", title: "连续学习", desc: "连续7天学习奖励", value: "+100" },
    ];
  }

  private getDefaultGrowthLevels() {
    return [
      { level: 1, name: "青铜学员", value: 0, benefits: ["基础功能"] },
      { level: 2, name: "白银学员", value: 500, benefits: ["9.8折优惠", "专属客服"] },
      { level: 3, name: "黄金学员", value: 1500, benefits: ["9.5折优惠", "优先答疑"] },
      { level: 4, name: "金牌学员", value: 3000, benefits: ["9折优惠", "免费直播"] },
      { level: 5, name: "钻石学员", value: 5000, benefits: ["8.5折优惠", "专属课程"] },
      { level: 6, name: "至尊学员", value: 10000, benefits: ["8折优惠", "一对一"] },
    ];
  }
}

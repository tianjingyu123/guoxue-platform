import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, UsePipes, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Request } from "express";
import { CommentService } from "./comment.service";
import { CreateCommentDto, UpdateCommentDto, CommentQueryDto, BatchHideDto } from "./comment.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";
import { SanitizePipe } from "../../common/sanitize.pipe";

@ApiTags("评论")
@Controller("comment")
export class CommentController {
  constructor(private comment: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "创建评论" })
  @ApiBearerAuth()
  create(@Req() req: Request, @Body() dto: CreateCommentDto) {
    return this.comment.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "获取评论列表" })
  findAll(@Query() dto: CommentQueryDto) {
    return this.comment.findByTarget(dto);
  }

  @Get(":id/replies")
  @ApiOperation({ summary: "获取评论回复" })
  findReplies(@Param("id") id: string) {
    return this.comment.findReplies(id);
  }

  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "点赞评论" })
  @ApiBearerAuth()
  like(@Param("id") id: string) {
    return this.comment.like(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @UsePipes(new SanitizePipe())
  @ApiOperation({ summary: "编辑评论" })
  @ApiBearerAuth()
  update(@Req() req: Request, @Param("id") id: string, @Body() dto: UpdateCommentDto) {
    return this.comment.update(req.user.id, id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除评论" })
  @ApiBearerAuth()
  delete(@Req() req: Request, @Param("id") id: string) {
    return this.comment.delete(req.user.id, id);
  }

  @Put(":id/hide")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.OPERATION_ADMIN, RoleType.CONTENT_AUDITOR)
  @ApiOperation({ summary: "隐藏评论（管理员）" })
  @ApiBearerAuth()
  hide(@Param("id") id: string) {
    return this.comment.hide(id);
  }

  @Get("count")
  @ApiOperation({ summary: "获取评论数量" })
  @ApiQuery({ name: "targetType", required: true })
  @ApiQuery({ name: "targetId", required: true })
  count(@Query("targetType") targetType: string, @Query("targetId") targetId: string) {
    return this.comment.getCommentCount(targetType, targetId);
  }

  // ───────── 管理员审核 ─────────

  @Get("moderation/list")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.OPERATION_ADMIN, RoleType.CONTENT_AUDITOR)
  @ApiOperation({ summary: "评论审核列表（管理员）" })
  @ApiBearerAuth()
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "targetType", required: false })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  moderationList(
    @Query("status") status?: string,
    @Query("targetType") targetType?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.comment.getModerationList({ status, targetType, page: +page, pageSize: +pageSize });
  }

  @Put("moderation/batch-hide")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.OPERATION_ADMIN)
  @ApiOperation({ summary: "批量隐藏评论" })
  @ApiBearerAuth()
  batchHide(@Body() dto: BatchHideDto) {
    return this.comment.batchHide(dto.ids);
  }

  // ───────── 用户评论 ─────────

  @Get("user/history")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "我的评论历史" })
  @ApiBearerAuth()
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  getUserComments(@Req() req: Request, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.comment.getUserComments(req.user.id, +page, +pageSize);
  }
}

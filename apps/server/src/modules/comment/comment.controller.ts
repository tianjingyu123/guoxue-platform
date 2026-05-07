import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CommentService } from "./comment.service";
import { CreateCommentDto, CommentQueryDto } from "./comment.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";

@ApiTags("评论")
@Controller("comment")
export class CommentController {
  constructor(private comment: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建评论" })
  @ApiBearerAuth()
  create(@Req() req: any, @Body() dto: CreateCommentDto) {
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

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除评论" })
  @ApiBearerAuth()
  delete(@Req() req: any, @Param("id") id: string) {
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
  @ApiQuery({ name: "targetType", required: true, type: String, description: "目标类型" })
  @ApiQuery({ name: "targetId", required: true, type: String, description: "目标ID" })
  count(@Query("targetType") targetType: string, @Query("targetId") targetId: string) {
    return this.comment.getCommentCount(targetType, targetId);
  }
}

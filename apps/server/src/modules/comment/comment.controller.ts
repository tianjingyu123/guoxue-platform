import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { CommentService } from "./comment.service";
import { CreateCommentDto, CommentQueryDto } from "./comment.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";
import { RoleType } from "@prisma/client";

@Controller("comment")
export class CommentController {
  constructor(private comment: CommentService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateCommentDto) {
    return this.comment.create(req.user.id, dto);
  }

  @Get()
  findAll(@Query() dto: CommentQueryDto) {
    return this.comment.findByTarget(dto);
  }

  @Get(":id/replies")
  findReplies(@Param("id") id: string) {
    return this.comment.findReplies(id);
  }

  @Post(":id/like")
  @UseGuards(JwtAuthGuard)
  like(@Param("id") id: string) {
    return this.comment.like(id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  delete(@Req() req: any, @Param("id") id: string) {
    return this.comment.delete(req.user.id, id);
  }

  @Put(":id/hide")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleType.SUPER_ADMIN, RoleType.OPERATION_ADMIN, RoleType.CONTENT_AUDITOR)
  hide(@Param("id") id: string) {
    return this.comment.hide(id);
  }

  @Get("count")
  count(@Query("targetType") targetType: string, @Query("targetId") targetId: string) {
    return this.comment.getCommentCount(targetType, targetId);
  }
}

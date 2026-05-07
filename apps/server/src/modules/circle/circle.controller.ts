import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { CircleService } from "./circle.service";
import { CreateCircleDto, UpdateCircleDto, CreatePostDto, JoinCircleDto, UpdateMemberRoleDto } from "./circle.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("circles")
export class CircleController {
  constructor(private circle: CircleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req: any, @Body() dto: CreateCircleDto) {
    return this.circle.create(req.user.id, dto);
  }

  @Get()
  list(
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
    @Query("keyword") keyword?: string,
    @Query("tag") tag?: string,
    @Query("type") type?: string,
  ) {
    return this.circle.listCircles({ page: +page, pageSize: +pageSize, keyword, tag, type });
  }

  @Get("my")
  @UseGuards(JwtAuthGuard)
  getMyCircles(@Req() req: any) {
    return this.circle.getMyCircles(req.user.id);
  }

  @Get(":id")
  detail(@Param("id") id: string, @Req() req?: any) {
    return this.circle.getDetail(id, req?.user?.id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Req() req: any, @Body() dto: UpdateCircleDto) {
    return this.circle.update(id, req.user.id, dto);
  }

  @Post(":id/join")
  @UseGuards(JwtAuthGuard)
  join(@Param("id") id: string, @Req() req: any, @Body() dto?: JoinCircleDto) {
    return this.circle.join(id, req.user.id, dto);
  }

  @Post(":id/leave")
  @UseGuards(JwtAuthGuard)
  leave(@Param("id") id: string, @Req() req: any) {
    return this.circle.leave(id, req.user.id);
  }

  @Get(":id/members")
  members(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.circle.listMembers(id, +page, +pageSize);
  }

  @Put(":id/members/:userId/role")
  @UseGuards(JwtAuthGuard)
  updateMemberRole(
    @Param("id") circleId: string,
    @Param("userId") targetUserId: string,
    @Req() req: any,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.circle.updateMemberRole(circleId, req.user.id, targetUserId, dto);
  }

  @Delete(":id/members/:userId")
  @UseGuards(JwtAuthGuard)
  removeMember(
    @Param("id") circleId: string,
    @Param("userId") targetUserId: string,
    @Req() req: any,
  ) {
    return this.circle.removeMember(circleId, req.user.id, targetUserId);
  }

  // ───────── 帖子 ─────────

  @Post(":id/posts")
  @UseGuards(JwtAuthGuard)
  createPost(@Param("id") circleId: string, @Req() req: any, @Body() dto: CreatePostDto) {
    return this.circle.createPost(circleId, req.user.id, dto);
  }

  @Get(":id/posts")
  getPosts(
    @Param("id") circleId: string,
    @Query("type") type?: string,
    @Query("isEssence") isEssence?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.circle.getPosts(circleId, { type, isEssence, page: +page, pageSize: +pageSize });
  }

  @Get(":id/posts/:postId")
  getPostDetail(@Param("postId") postId: string) {
    return this.circle.getPostDetail(postId);
  }

  @Put(":id/posts/:postId")
  @UseGuards(JwtAuthGuard)
  updatePost(@Param("postId") postId: string, @Req() req: any, @Body() dto: CreatePostDto) {
    return this.circle.updatePost(postId, req.user.id, dto);
  }

  @Delete(":id/posts/:postId")
  @UseGuards(JwtAuthGuard)
  deletePost(
    @Param("id") circleId: string,
    @Param("postId") postId: string,
    @Req() req: any,
  ) {
    return this.circle.deletePost(postId, req.user.id, circleId);
  }

  @Post(":id/posts/:postId/essence")
  @UseGuards(JwtAuthGuard)
  toggleEssence(@Param("id") circleId: string, @Param("postId") postId: string, @Req() req: any) {
    return this.circle.toggleEssence(postId, circleId, req.user.id);
  }

  @Post(":id/posts/:postId/top")
  @UseGuards(JwtAuthGuard)
  toggleTop(@Param("id") circleId: string, @Param("postId") postId: string, @Req() req: any) {
    return this.circle.toggleTop(postId, circleId, req.user.id);
  }
}

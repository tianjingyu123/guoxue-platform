import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CircleService } from "./circle.service";
import { CreateCircleDto, UpdateCircleDto, CreatePostDto, JoinCircleDto, UpdateMemberRoleDto } from "./circle.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("圈子")
@Controller("circles")
export class CircleController {
  constructor(private circle: CircleService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建圈子" })
  @ApiBearerAuth()
  create(@Req() req: any, @Body() dto: CreateCircleDto) {
    return this.circle.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "获取圈子列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  @ApiQuery({ name: "keyword", required: false, type: String, description: "搜索关键词" })
  @ApiQuery({ name: "tag", required: false, type: String, description: "标签筛选" })
  @ApiQuery({ name: "type", required: false, type: String, description: "类型筛选" })
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
  @ApiOperation({ summary: "获取我的圈子" })
  @ApiBearerAuth()
  getMyCircles(@Req() req: any) {
    return this.circle.getMyCircles(req.user.id);
  }

  @Get(":id")
  @ApiOperation({ summary: "获取圈子详情" })
  detail(@Param("id") id: string, @Req() req?: any) {
    return this.circle.getDetail(id, req?.user?.id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新圈子" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Req() req: any, @Body() dto: UpdateCircleDto) {
    return this.circle.update(id, req.user.id, dto);
  }

  @Post(":id/join")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "加入圈子" })
  @ApiBearerAuth()
  join(@Param("id") id: string, @Req() req: any, @Body() dto?: JoinCircleDto) {
    return this.circle.join(id, req.user.id, dto);
  }

  @Post(":id/leave")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "退出圈子" })
  @ApiBearerAuth()
  leave(@Param("id") id: string, @Req() req: any) {
    return this.circle.leave(id, req.user.id);
  }

  @Get(":id/members")
  @ApiOperation({ summary: "获取圈子成员列表" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
  members(@Param("id") id: string, @Query("page") page = 1, @Query("pageSize") pageSize = 20) {
    return this.circle.listMembers(id, +page, +pageSize);
  }

  @Put(":id/members/:userId/role")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新成员角色" })
  @ApiBearerAuth()
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
  @ApiOperation({ summary: "移除圈子成员" })
  @ApiBearerAuth()
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
  @ApiOperation({ summary: "创建帖子" })
  @ApiBearerAuth()
  createPost(@Param("id") circleId: string, @Req() req: any, @Body() dto: CreatePostDto) {
    return this.circle.createPost(circleId, req.user.id, dto);
  }

  @Get(":id/posts")
  @ApiOperation({ summary: "获取帖子列表" })
  @ApiQuery({ name: "type", required: false, type: String, description: "帖子类型" })
  @ApiQuery({ name: "isEssence", required: false, type: String, description: "精华帖筛选" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "pageSize", required: false, type: Number, description: "每页数量" })
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
  @ApiOperation({ summary: "获取帖子详情" })
  getPostDetail(@Param("postId") postId: string) {
    return this.circle.getPostDetail(postId);
  }

  @Put(":id/posts/:postId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新帖子" })
  @ApiBearerAuth()
  updatePost(@Param("postId") postId: string, @Req() req: any, @Body() dto: CreatePostDto) {
    return this.circle.updatePost(postId, req.user.id, dto);
  }

  @Delete(":id/posts/:postId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除帖子" })
  @ApiBearerAuth()
  deletePost(
    @Param("id") circleId: string,
    @Param("postId") postId: string,
    @Req() req: any,
  ) {
    return this.circle.deletePost(postId, req.user.id, circleId);
  }

  @Post(":id/posts/:postId/essence")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "切换帖子精华状态" })
  @ApiBearerAuth()
  toggleEssence(@Param("id") circleId: string, @Param("postId") postId: string, @Req() req: any) {
    return this.circle.toggleEssence(postId, circleId, req.user.id);
  }

  @Post(":id/posts/:postId/top")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "切换帖子置顶状态" })
  @ApiBearerAuth()
  toggleTop(@Param("id") circleId: string, @Param("postId") postId: string, @Req() req: any) {
    return this.circle.toggleTop(postId, circleId, req.user.id);
  }
}

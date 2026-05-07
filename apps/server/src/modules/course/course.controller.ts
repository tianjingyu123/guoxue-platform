import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Query, Req, UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CourseService } from "./course.service";
import {
  CreateCourseDto, UpdateCourseDto,
  CreateChapterDto, UpdateChapterDto,
  UpdateProgressDto, SubmitWorkDto,
  CourseListQueryDto,
} from "./course.dto";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";
import { RolesGuard } from "../../common/roles.guard";
import { Roles } from "../../common/roles.decorator";

@ApiTags("课程")
@Controller("courses")
export class CourseController {
  constructor(private course: CourseService) {}

  // ───────── 课程 CRUD ─────────

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "创建课程" })
  @ApiBearerAuth()
  create(@Req() req: any, @Body() dto: CreateCourseDto) {
    return this.course.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "获取课程列表" })
  list(@Query() q: CourseListQueryDto) {
    return this.course.listCourses({
      page: q.page || 1,
      pageSize: q.pageSize || 20,
      circleId: q.circleId,
      auditStatus: q.auditStatus,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "获取课程详情" })
  detail(@Param("id") id: string) {
    return this.course.getDetail(id);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新课程" })
  @ApiBearerAuth()
  update(@Param("id") id: string, @Req() req: any, @Body() dto: UpdateCourseDto) {
    return this.course.update(id, req.user.id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除课程" })
  @ApiBearerAuth()
  delete(@Param("id") id: string, @Req() req: any) {
    return this.course.delete(id, req.user.id);
  }

  // ───────── 审核 ─────────

  @Put(":id/audit")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("SUPER_ADMIN", "OPERATION_ADMIN")
  @ApiOperation({ summary: "审核课程" })
  @ApiBearerAuth()
  audit(@Param("id") id: string, @Body("status") status: string) {
    return this.course.audit(id, status);
  }

  // ───────── 章节管理 ─────────

  @Post(":id/chapters")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "添加课程章节" })
  @ApiBearerAuth()
  addChapter(@Param("id") id: string, @Req() req: any, @Body() dto: CreateChapterDto) {
    return this.course.addChapter(id, req.user.id, dto);
  }

  @Get(":id/chapters")
  @ApiOperation({ summary: "获取课程章节列表" })
  getChapters(@Param("id") id: string) {
    return this.course.getChapters(id);
  }

  @Put(":id/chapters/:chapterId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新课程章节" })
  @ApiBearerAuth()
  updateChapter(
    @Param("id") id: string,
    @Param("chapterId") chapterId: string,
    @Req() req: any,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.course.updateChapter(chapterId, id, req.user.id, dto);
  }

  @Delete(":id/chapters/:chapterId")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "删除课程章节" })
  @ApiBearerAuth()
  deleteChapter(
    @Param("id") id: string,
    @Param("chapterId") chapterId: string,
    @Req() req: any,
  ) {
    return this.course.deleteChapter(chapterId, id, req.user.id);
  }

  // ───────── 学习进度 ─────────

  @Put("chapters/:chapterId/progress")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新学习进度" })
  @ApiBearerAuth()
  updateProgress(@Req() req: any, @Param("chapterId") chapterId: string, @Body() dto: UpdateProgressDto) {
    return this.course.updateProgress(req.user.id, chapterId, dto);
  }

  @Get(":id/progress")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取我的学习进度" })
  @ApiBearerAuth()
  getMyProgress(@Req() req: any, @Param("id") id: string) {
    return this.course.getMyProgress(req.user.id, id);
  }

  // ───────── 作业 ─────────

  @Post("chapters/:chapterId/works")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "提交作业" })
  @ApiBearerAuth()
  submitWork(@Req() req: any, @Param("chapterId") chapterId: string, @Body() dto: SubmitWorkDto) {
    return this.course.submitWork(req.user.id, chapterId, dto);
  }

  @Get(":id/works")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取作业列表" })
  @ApiBearerAuth()
  @ApiQuery({ name: "chapterId", required: false, type: String, description: "章节ID" })
  getWorks(@Param("id") id: string, @Query("chapterId") chapterId?: string) {
    return this.course.getWorks(id, chapterId);
  }

  @Put("works/:workId/score")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "批改作业评分" })
  @ApiBearerAuth()
  scoreWork(
    @Param("workId") workId: string,
    @Req() req: any,
    @Body("score") score: number,
    @Body("feedback") feedback?: string,
  ) {
    return this.course.scoreWork(workId, req.user.id, score, feedback);
  }
}

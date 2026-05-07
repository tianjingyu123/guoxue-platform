import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { RecommendService } from "./recommend.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@ApiTags("推荐")
@Controller("recommend")
export class RecommendController {
  constructor(private recommend: RecommendService) {}

  @Get("trending")
  @ApiOperation({ summary: "获取热门推荐" })
  trending() {
    return this.recommend.trending();
  }

  @Get("related/:contentId")
  @ApiOperation({ summary: "获取相关内容" })
  related(@Param("contentId") contentId: string) {
    return this.recommend.related(contentId);
  }

  @Get("personalized")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取个性化推荐" })
  @ApiBearerAuth()
  personalized(@Req() req: any) {
    return this.recommend.personalized(req.user.id);
  }
}

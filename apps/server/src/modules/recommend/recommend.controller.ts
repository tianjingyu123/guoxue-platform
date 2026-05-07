import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { RecommendService } from "./recommend.service";
import { JwtAuthGuard } from "../../common/jwt-auth.guard";

@Controller("recommend")
export class RecommendController {
  constructor(private recommend: RecommendService) {}

  @Get("trending")
  trending() {
    return this.recommend.trending();
  }

  @Get("related/:contentId")
  related(@Param("contentId") contentId: string) {
    return this.recommend.related(contentId);
  }

  @Get("personalized")
  @UseGuards(JwtAuthGuard)
  personalized(@Req() req: any) {
    return this.recommend.personalized(req.user.id);
  }
}

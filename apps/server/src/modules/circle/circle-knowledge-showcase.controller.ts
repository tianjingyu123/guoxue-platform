import { Controller, Get, Param } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CircleKnowledgeShowcaseService } from "./circle-knowledge-showcase.service";

@ApiTags("圈外知识星图")
@Controller("circles")
export class CircleKnowledgeShowcaseController {
  constructor(private readonly showcase: CircleKnowledgeShowcaseService) {}

  @Get(":circleId/knowledge-showcase")
  @ApiOperation({ summary: "获取圈子已审核公开的知识点星图（无可公开内容时返回空图）" })
  @ApiResponse({ status: 200, description: "仅返回公开短摘要与审核过的关系" })
  getPublicGraph(@Param("circleId") circleId: string) {
    return this.showcase.getPublicGraph(circleId);
  }
}

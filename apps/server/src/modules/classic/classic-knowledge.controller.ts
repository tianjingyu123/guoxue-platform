import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from "@nestjs/swagger";
import { KnowledgeGraphService } from "../ai-gateway/knowledge-graph.service";

@ApiTags("古籍知识图谱")
@Controller("classic/knowledge")
export class ClassicKnowledgeController {
  constructor(private readonly kg: KnowledgeGraphService) {}

  @Get("entities")
  @ApiOperation({ summary: "查询知识图谱实体列表" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "type", required: false, description: "实体类型: person/book/concept/dynasty/event/place" })
  @ApiQuery({ name: "page", required: false })
  @ApiQuery({ name: "pageSize", required: false })
  listEntities(
    @Query("type") type?: string,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.kg.listEntities(type, +page, +pageSize);
  }

  @Get("entities/stats")
  @ApiOperation({ summary: "实体类型统计" })
  @ApiResponse({ status: 200, description: "成功" })
  entityStats() {
    return this.kg.countByType();
  }

  @Get("entities/:name")
  @ApiOperation({ summary: "查询实体详情及其关联实体" })
  @ApiResponse({ status: 200, description: "成功" })
  async getEntity(@Param("name") name: string) {
    const entity = await this.kg.getEntity(name);
    if (!entity) return null;
    const expanded = await this.kg.expandEntity(name);
    return expanded;
  }

  @Get("path")
  @ApiOperation({ summary: "查找两实体间的最短路径（BFS）" })
  @ApiResponse({ status: 200, description: "成功" })
  @ApiQuery({ name: "from", required: true })
  @ApiQuery({ name: "to", required: true })
  findPath(@Query("from") from: string, @Query("to") to: string) {
    return this.kg.findPath(from, to);
  }
}

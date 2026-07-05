import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

/**
 * 标准分页查询 DTO 基类（坏味道 P2-4·2026-07-05）。
 *
 * controller 层输入校验：`@Type(() => Number)` 把 query string 转 number，
 * `@IsInt()` 在边界即拦 NaN/非整数（返回 400 而非让 `skip:NaN` 进 Prisma 抛 500），
 * `@Min(1)` 拒非法页码、`@Max(100)` 防大页拖库/DoS。
 *
 * 用法（新代码推荐）：
 *   class XxxQueryDto extends PaginationQueryDto { //  + 业务过滤字段 }
 *   list(@Query() q: XxxQueryDto) {
 *     const { page, pageSize, skip } = safePagination(q.page, q.pageSize); // 服务层再兜一层
 *     ...
 *     return paginated(rows, total, page, pageSize);
 *   }
 *
 * 注：仅供**新代码/存量收敛**继承；不改动任何现有端点。与服务层 `safePagination`
 * （common/pagination.ts）双层设防——controller 拦非法输入、service 兜底归一化。
 */
export class PaginationQueryDto {
  @ApiPropertyOptional({ description: "页码（从 1 起）", default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页条数（上限 100）", default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

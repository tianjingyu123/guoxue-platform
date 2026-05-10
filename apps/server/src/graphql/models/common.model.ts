import { Field, ObjectType, Int } from "@nestjs/graphql";

@ObjectType({ description: "分页信息" })
export class PageInfo {
  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  pageSize: number;

  @Field()
  hasMore: boolean;
}

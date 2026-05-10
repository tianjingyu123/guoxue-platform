import { Field, InputType, Int } from "@nestjs/graphql";

@InputType()
export class PaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  page: number;

  @Field(() => Int, { defaultValue: 10 })
  pageSize: number;
}

@InputType()
export class ContentFilter extends PaginationInput {
  @Field({ nullable: true })
  type?: string;

  @Field({ nullable: true })
  keyword?: string;

  @Field({ nullable: true })
  stationId?: string;
}

@InputType()
export class ArticleFilter extends PaginationInput {
  @Field({ nullable: true })
  circleId?: string;

  @Field({ nullable: true })
  stationId?: string;
}

@InputType()
export class CircleFilter extends PaginationInput {
  @Field({ nullable: true })
  stationId?: string;
}

@InputType()
export class CourseFilter extends PaginationInput {
  @Field({ nullable: true })
  circleId?: string;

  @Field({ nullable: true })
  stationId?: string;
}

@InputType()
export class ProductFilter extends PaginationInput {
  @Field({ nullable: true })
  categoryId?: string;

  @Field({ nullable: true })
  stationId?: string;
}

@InputType()
export class LiveFilter extends PaginationInput {
  @Field({ nullable: true })
  status?: string;
}

@InputType()
export class ClassicFilter extends PaginationInput {
  @Field({ nullable: true })
  category?: string;
}

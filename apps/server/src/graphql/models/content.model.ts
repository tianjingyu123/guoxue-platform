import { Field, ObjectType, ID, Int } from "@nestjs/graphql";

@ObjectType({ description: "内容" })
export class Content {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  author?: string;

  @Field({ nullable: true })
  dynasty?: string;

  @Field({ nullable: true })
  excerpt?: string;

  @Field({ nullable: true })
  body?: string;

  @Field({ nullable: true })
  cover?: string;

  @Field(() => [String])
  tags: string[];

  @Field(() => Int)
  viewCount: number;

  @Field(() => Int)
  likeCount: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  stationId?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType({ description: "古籍" })
export class ClassicBook {
  @Field(() => ID)
  id: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  author?: string;

  @Field({ nullable: true })
  dynasty?: string;

  @Field()
  category: string;

  @Field({ nullable: true })
  cover?: string;

  @Field({ nullable: true })
  intro?: string;

  @Field(() => Int)
  chapterCount: number;

  @Field(() => Int)
  viewCount: number;

  @Field()
  status: string;

  @Field()
  createdAt: Date;
}

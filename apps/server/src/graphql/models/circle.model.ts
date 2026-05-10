import { Field, ObjectType, ID, Int, Float } from "@nestjs/graphql";

@ObjectType({ description: "圈子" })
export class Circle {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  intro: string;

  @Field({ nullable: true })
  cover?: string;

  @Field(() => [String])
  tags: string[];

  @Field()
  type: string;

  @Field(() => Float)
  price: number;

  @Field(() => Int)
  memberCount: number;

  @Field(() => Int)
  postCount: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  stationId?: string;

  @Field()
  createdAt: Date;
}

@ObjectType({ description: "帖子" })
export class Post {
  @Field(() => ID)
  id: string;

  @Field()
  circleId: string;

  @Field()
  userId: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  title?: string;

  @Field()
  content: string;

  @Field(() => [String])
  images: string[];

  @Field({ nullable: true })
  videoUrl?: string;

  @Field()
  isEssence: boolean;

  @Field()
  isTop: boolean;

  @Field()
  status: string;

  @Field()
  createdAt: Date;
}

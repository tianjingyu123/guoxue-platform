import { Field, ObjectType, ID, Int } from "@nestjs/graphql";

@ObjectType({ description: "用户（公开信息）" })
export class User {
  @Field(() => ID)
  id: string;

  @Field()
  nickname: string;

  @Field({ nullable: true })
  avatar?: string;

  @Field(() => Int, { nullable: true })
  gender?: number;

  @Field()
  memberLevel: string;

  @Field({ nullable: true })
  memberExpire?: Date;

  @Field()
  status: string;

  @Field()
  createdAt: Date;
}

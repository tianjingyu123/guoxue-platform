import { Field, ObjectType, ID, Int, Float } from "@nestjs/graphql";

@ObjectType({ description: "直播间" })
export class LiveRoom {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  circleId?: string;

  @Field()
  userId: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  cover?: string;

  @Field()
  hostUserId: string;

  @Field()
  status: string;

  @Field(() => Int)
  viewCount: number;

  @Field()
  chargeType: string;

  @Field(() => Float, { nullable: true })
  chargePrice?: number;

  @Field({ nullable: true })
  startTime?: Date;

  @Field({ nullable: true })
  endTime?: Date;

  @Field({ nullable: true })
  replayUrl?: string;

  @Field()
  createdAt: Date;
}

import { Field, ObjectType, ID, Int, Float } from "@nestjs/graphql";

@ObjectType({ description: "课程" })
export class Course {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  circleId?: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  cover?: string;

  @Field({ nullable: true })
  intro?: string;

  @Field()
  type: string;

  @Field(() => Float)
  price: number;

  @Field(() => Float, { nullable: true })
  originalPrice?: number;

  @Field(() => [String])
  tags: string[];

  @Field(() => Int)
  studentCount: number;

  @Field()
  auditStatus: string;

  @Field()
  createdAt: Date;
}

@ObjectType({ description: "商品" })
export class Product {
  @Field(() => ID)
  id: string;

  @Field({ nullable: true })
  circleId?: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  intro?: string;

  @Field()
  detail: string;

  @Field(() => [String])
  images: string[];

  @Field(() => Float)
  price: number;

  @Field(() => Int)
  stock: number;

  @Field(() => Int)
  salesCount: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  stationId?: string;

  @Field()
  createdAt: Date;
}

@ObjectType({ description: "订单" })
export class Order {
  @Field(() => ID)
  id: string;

  @Field()
  userId: string;

  @Field()
  type: string;

  @Field()
  targetId: string;

  @Field(() => Float)
  amount: number;

  @Field(() => Float, { nullable: true })
  payAmount?: number;

  @Field()
  status: string;

  @Field({ nullable: true })
  payMethod?: string;

  @Field({ nullable: true })
  paidAt?: Date;

  @Field()
  createdAt: Date;
}

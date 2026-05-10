import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { PrismaModule } from "../prisma/prisma.module";
import { ContentResolver } from "./resolvers/content.resolver";
import { CircleResolver } from "./resolvers/circle.resolver";
import { ShopResolver } from "./resolvers/shop.resolver";
import { LiveResolver } from "./resolvers/live.resolver";

@Module({
  imports: [
    PrismaModule,
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      sortSchema: true,
      playground: false,
      introspection: process.env.NODE_ENV !== "production",
      path: "/graphql",
      context: ({ req }: { req: Record<string, unknown> }) => ({ req }),
    }),
  ],
  providers: [ContentResolver, CircleResolver, ShopResolver, LiveResolver],
})
export class GqlModule {}

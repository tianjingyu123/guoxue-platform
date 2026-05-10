import { Module } from "@nestjs/common";
import { AppModule } from "./app.module";
import { GqlModule } from "./graphql/graphql.module";

@Module({
  imports: [AppModule, GqlModule],
})
export class AppGraphqlModule {}

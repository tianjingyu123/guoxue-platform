import { Module } from "@nestjs/common";
import { InstituteService } from "./institute.service";
import { InstituteController } from "./institute.controller";
import { InstituteContentController } from "./content.controller";
import { InstituteContentService } from "./content.service";

@Module({
  controllers: [InstituteController, InstituteContentController],
  providers: [InstituteService, InstituteContentService],
  exports: [InstituteService, InstituteContentService],
})
export class InstituteModule {}

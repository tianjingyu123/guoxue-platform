import { Module } from "@nestjs/common";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { STORAGE_PROVIDER } from "./storage.interface";
import { LocalStorageProvider } from "./local-storage.provider";
import { CosStorageProvider } from "./cos-storage.provider";

@Module({
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: STORAGE_PROVIDER,
      useFactory: () => {
        const useCos = process.env.COS_SECRET_ID && process.env.COS_SECRET_KEY && process.env.COS_BUCKET;
        return useCos ? new CosStorageProvider() : new LocalStorageProvider();
      },
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}

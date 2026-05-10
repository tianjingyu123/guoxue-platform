import { IsString, IsOptional, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class IdCardOcrDto {
  @ApiPropertyOptional({ description: "身份证图片URL" })
  @IsOptional() @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: "身份证图片Base64" })
  @IsOptional() @IsString()
  imageBase64?: string;

  @ApiProperty({ description: "身份证面", enum: ["FRONT", "BACK"] })
  @IsEnum(["FRONT", "BACK"])
  side: "FRONT" | "BACK";
}

export class IdCardVerifyDto {
  @ApiProperty({ description: "真实姓名", example: "张三" })
  @IsString()
  name: string;

  @ApiProperty({ description: "身份证号码", example: "110101199001011234" })
  @IsString()
  idCard: string;
}

export class FaceTokenDto {
  @ApiProperty({ description: "真实姓名" })
  @IsString()
  name: string;

  @ApiProperty({ description: "身份证号码" })
  @IsString()
  idCard: string;

  @ApiPropertyOptional({ description: "鉴权完成跳转URL" })
  @IsOptional() @IsString()
  returnUrl?: string;
}

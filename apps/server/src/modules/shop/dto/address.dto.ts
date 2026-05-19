import { IsString, IsOptional, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateAddressDto {
  @ApiProperty({ description: "收货人姓名" })
  @IsString() @MinLength(1)
  name: string;

  @ApiProperty({ description: "手机号" })
  @IsString() @MinLength(11)
  phone: string;

  @ApiProperty({ description: "省" })
  @IsString() @MinLength(1)
  province: string;

  @ApiProperty({ description: "市" })
  @IsString() @MinLength(1)
  city: string;

  @ApiProperty({ description: "区/县" })
  @IsString() @MinLength(1)
  district: string;

  @ApiProperty({ description: "详细地址" })
  @IsString() @MinLength(1)
  detail: string;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({ description: "收货人姓名" })
  @IsOptional() @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "手机号" })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: "省" })
  @IsOptional() @IsString()
  province?: string;

  @ApiPropertyOptional({ description: "市" })
  @IsOptional() @IsString()
  city?: string;

  @ApiPropertyOptional({ description: "区/县" })
  @IsOptional() @IsString()
  district?: string;

  @ApiPropertyOptional({ description: "详细地址" })
  @IsOptional() @IsString()
  detail?: string;
}

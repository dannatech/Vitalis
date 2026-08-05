import { ApiProperty } from '@nestjs/swagger';
import { ConsentMethod, ConsentPurpose } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateConsentDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ enum: ConsentPurpose }) @IsEnum(ConsentPurpose) purpose!: ConsentPurpose;
  @ApiProperty() @IsBoolean() granted!: boolean;
  @ApiProperty({ enum: ConsentMethod }) @IsEnum(ConsentMethod) method!: ConsentMethod;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

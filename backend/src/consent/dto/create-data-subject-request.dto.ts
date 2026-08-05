import { ApiProperty } from '@nestjs/swagger';
import { DataSubjectRequestType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDataSubjectRequestDto {
  @ApiProperty() @IsUUID() patientId!: string;
  @ApiProperty({ enum: DataSubjectRequestType }) @IsEnum(DataSubjectRequestType) type!: DataSubjectRequestType;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
}

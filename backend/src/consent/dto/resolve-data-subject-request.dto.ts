import { ApiProperty } from '@nestjs/swagger';
import { DataSubjectRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ResolveDataSubjectRequestDto {
  @ApiProperty({ enum: DataSubjectRequestStatus })
  @IsEnum(DataSubjectRequestStatus)
  status!: DataSubjectRequestStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

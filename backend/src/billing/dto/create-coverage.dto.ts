import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateCoverageDto {
  @ApiProperty()
  @IsUUID()
  payerId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  enrolleeId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  planName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  validTo?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

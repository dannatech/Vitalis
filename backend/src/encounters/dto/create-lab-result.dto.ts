import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateLabResultDto {
  @ApiProperty() @IsString() resultValue!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() unit?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() referenceRange?: string;
  @ApiProperty({ required: false, default: false }) @IsOptional() @IsBoolean() flagged?: boolean;
}

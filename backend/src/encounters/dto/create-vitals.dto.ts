import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsNumber } from 'class-validator';

export class CreateVitalsDto {
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() temperatureC?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() bloodPressureSys?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() bloodPressureDia?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() pulseBpm?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() respiratoryRate?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() spo2Percent?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() weightKg?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() heightCm?: number;
}

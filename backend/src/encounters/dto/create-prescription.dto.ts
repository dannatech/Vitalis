import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class CreatePrescriptionDto {
  @ApiProperty() @IsString() medicationName!: string;
  @ApiProperty() @IsString() dosage!: string;
  @ApiProperty() @IsString() frequency!: string;
  @ApiProperty() @IsInt() @Min(1) durationDays!: number;
  @ApiProperty() @IsString() route!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDiagnosisDto {
  @ApiProperty()
  @IsString()
  icd10Code!: string;

  @ApiProperty()
  @IsString()
  description!: string;

  @ApiProperty({ required: false, description: 'Offline-client idempotency key' })
  @IsOptional()
  @IsString()
  clientGeneratedId?: string;
}

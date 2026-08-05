import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateDiagnosisDto {
  @ApiProperty()
  @IsString()
  icd10Code!: string;

  @ApiProperty()
  @IsString()
  description!: string;
}

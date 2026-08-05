import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreatePatientDto } from '../../patients/dto/create-patient.dto';
import { CreateEncounterDto } from '../../encounters/dto/create-encounter.dto';

export class PushSyncDto {
  @ApiProperty({ type: [CreatePatientDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePatientDto)
  patients?: CreatePatientDto[];

  @ApiProperty({ type: [CreateEncounterDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEncounterDto)
  encounters?: CreateEncounterDto[];
}

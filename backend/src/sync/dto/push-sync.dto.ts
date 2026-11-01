import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { CreatePatientDto } from '../../patients/dto/create-patient.dto';
import { CreateEncounterDto } from '../../encounters/dto/create-encounter.dto';
import { PushVitalsDto } from './push-vitals.dto';
import { PushDiagnosisDto } from './push-diagnosis.dto';
import { PushPrescriptionDto } from './push-prescription.dto';
import { PushLabOrderDto } from './push-lab-order.dto';

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

  @ApiProperty({ type: [PushVitalsDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushVitalsDto)
  vitals?: PushVitalsDto[];

  @ApiProperty({ type: [PushDiagnosisDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushDiagnosisDto)
  diagnoses?: PushDiagnosisDto[];

  @ApiProperty({ type: [PushPrescriptionDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushPrescriptionDto)
  prescriptions?: PushPrescriptionDto[];

  @ApiProperty({ type: [PushLabOrderDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PushLabOrderDto)
  labOrders?: PushLabOrderDto[];
}

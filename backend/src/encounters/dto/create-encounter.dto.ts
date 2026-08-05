import { ApiProperty } from '@nestjs/swagger';
import { EncounterType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateEncounterDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ enum: EncounterType })
  @IsEnum(EncounterType)
  type!: EncounterType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'Offline-client idempotency key' })
  @IsOptional()
  @IsString()
  clientGeneratedId?: string;
}

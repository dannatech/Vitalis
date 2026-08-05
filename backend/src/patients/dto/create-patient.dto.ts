import { ApiProperty } from '@nestjs/swagger';
import { Sex } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePatientDto {
  @ApiProperty()
  @IsString()
  @MaxLength(64)
  mrn!: string;

  @ApiProperty({ required: false, description: 'National Identification Number (NIMC)' })
  @IsOptional()
  @IsString()
  nin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nhisNumber?: string;

  @ApiProperty()
  @IsString()
  surname!: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  otherNames?: string;

  @ApiProperty()
  @IsDateString()
  dateOfBirth!: string;

  @ApiProperty({ enum: Sex })
  @IsEnum(Sex)
  sex!: Sex;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lga?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextOfKinName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextOfKinPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nextOfKinRelation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  genotype?: string;

  @ApiProperty({
    required: false,
    description: 'Idempotency key set by an offline client; prevents duplicate creation on sync retry',
  })
  @IsOptional()
  @IsString()
  clientGeneratedId?: string;
}

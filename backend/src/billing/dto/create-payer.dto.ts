import { ApiProperty } from '@nestjs/swagger';
import { PayerType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreatePayerDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: PayerType })
  @IsEnum(PayerType)
  type!: PayerType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactInfo?: string;
}

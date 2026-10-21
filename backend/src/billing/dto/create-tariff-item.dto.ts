import { ApiProperty } from '@nestjs/swagger';
import { TariffCategory } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateTariffItemDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: TariffCategory })
  @IsEnum(TariffCategory)
  category!: TariffCategory;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ required: false, description: 'Internal service code' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({
    required: false,
    description: 'Negotiated rate for a specific payer; omit for the default/self-pay price',
  })
  @IsOptional()
  @IsUUID()
  payerId?: string;
}

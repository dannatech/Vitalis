import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddChargeLineDto {
  @ApiProperty({
    required: false,
    description: 'Pick an existing tariff item to prefill description/price, or omit for a free-text line',
  })
  @IsOptional()
  @IsUUID()
  tariffItemId?: string;

  @ApiProperty({ required: false, description: 'Required if tariffItemId is omitted' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Required if tariffItemId is omitted' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @ApiProperty({ required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RecordPaymentDto {
  @ApiProperty()
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}

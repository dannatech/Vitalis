import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  payerId?: string;
}

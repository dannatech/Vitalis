import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty()
  @IsUUID()
  patientId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Defaults to the facility\'s Self-Pay payer if omitted', required: false })
  @IsOptional()
  @IsUUID()
  payerId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  coverageId?: string;
}

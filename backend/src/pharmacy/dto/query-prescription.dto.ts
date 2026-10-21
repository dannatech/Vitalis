import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class QueryPrescriptionDto {
  @ApiPropertyOptional({ enum: ['pending', 'dispensed'] })
  @IsOptional()
  @IsIn(['pending', 'dispensed'])
  status?: 'pending' | 'dispensed';
}

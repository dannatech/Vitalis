import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class QueryNcdcReportDto {
  @ApiPropertyOptional({ enum: ['pending', 'reported'] })
  @IsOptional()
  @IsIn(['pending', 'reported'])
  status?: 'pending' | 'reported';
}

import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class GenerateClaimDto {
  @ApiProperty()
  @IsUUID()
  payerId!: string;

  @ApiProperty()
  @IsDateString()
  periodStart!: string;

  @ApiProperty()
  @IsDateString()
  periodEnd!: string;
}

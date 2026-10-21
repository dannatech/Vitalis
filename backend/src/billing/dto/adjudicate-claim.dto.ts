import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class AdjudicateClaimDto {
  @ApiProperty({ enum: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'] })
  @IsIn(['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'])
  status!: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED';

  @ApiProperty({ required: false, description: 'Required for APPROVED/PARTIALLY_APPROVED' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  approvedAmount?: number;

  @ApiProperty({ required: false, description: 'Required for REJECTED/PARTIALLY_APPROVED' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateLabOrderDto {
  @ApiProperty()
  @IsString()
  testName!: string;

  @ApiProperty({ required: false, description: 'Offline-client idempotency key' })
  @IsOptional()
  @IsString()
  clientGeneratedId?: string;
}

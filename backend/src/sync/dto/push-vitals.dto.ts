import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateVitalsDto } from '../../encounters/dto/create-vitals.dto';

export class PushVitalsDto extends CreateVitalsDto {
  @ApiProperty()
  @IsUUID()
  encounterId!: string;
}

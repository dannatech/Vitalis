import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateLabOrderDto } from '../../encounters/dto/create-lab-order.dto';

export class PushLabOrderDto extends CreateLabOrderDto {
  @ApiProperty()
  @IsUUID()
  encounterId!: string;
}

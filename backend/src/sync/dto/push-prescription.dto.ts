import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreatePrescriptionDto } from '../../encounters/dto/create-prescription.dto';

export class PushPrescriptionDto extends CreatePrescriptionDto {
  @ApiProperty()
  @IsUUID()
  encounterId!: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { CreateDiagnosisDto } from '../../encounters/dto/create-diagnosis.dto';

export class PushDiagnosisDto extends CreateDiagnosisDto {
  @ApiProperty()
  @IsUUID()
  encounterId!: string;
}

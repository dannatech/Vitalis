import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'New facility/hospital name' })
  @IsString()
  facilityName!: string;

  @ApiProperty()
  @IsString()
  state!: string;

  @ApiProperty({ description: 'Local Government Area' })
  @IsString()
  lga!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  facilityPhone?: string;

  @ApiProperty({ description: "The first admin account's full name" })
  @IsString()
  adminFullName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}

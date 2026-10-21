import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;

  @ApiProperty({ required: false, description: 'License number for clinical roles (MDCN/NMCN/PCN/etc.)' })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  licenseBody?: string;
}

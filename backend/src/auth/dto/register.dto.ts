import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { COUNTRY_CODES, type CountryCode } from '../../common/countries';

export class RegisterDto {
  @ApiProperty({ description: 'New facility/hospital name' })
  @IsString()
  facilityName!: string;

  @ApiProperty({ enum: COUNTRY_CODES, description: 'ISO 3166-1 alpha-2 country code' })
  @IsIn(COUNTRY_CODES)
  country!: CountryCode;

  @ApiProperty({ description: 'Top-level address subdivision — State/County/Region/Province' })
  @IsString()
  state!: string;

  @ApiProperty({ description: 'Second-level address subdivision — LGA/Sub-county/District/Municipality' })
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

import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.RECORDS_OFFICER, Role.NURSE, Role.DOCTOR)
  @Audit('PATIENT_CREATE', 'Patient')
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.create(dto, user);
  }

  @Get()
  @Audit('PATIENT_LIST', 'Patient')
  findAll(@Query() query: QueryPatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.findAll(query, user);
  }

  @Get(':id')
  @Audit('PATIENT_READ', 'Patient')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patientsService.findOne(id, user);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.RECORDS_OFFICER, Role.NURSE, Role.DOCTOR)
  @Audit('PATIENT_UPDATE', 'Patient')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.patientsService.update(id, dto, user);
  }
}

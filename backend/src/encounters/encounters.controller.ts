import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { EncountersService } from './encounters.service';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('encounters')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('encounters')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post()
  @Roles(Role.DOCTOR, Role.NURSE)
  @Audit('ENCOUNTER_CREATE', 'Encounter')
  create(@Body() dto: CreateEncounterDto, @CurrentUser() user: AuthenticatedUser) {
    return this.encountersService.create(dto, user);
  }

  @Get()
  @Audit('ENCOUNTER_LIST', 'Encounter')
  findAllForPatient(@Query('patientId') patientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.encountersService.findAllForPatient(patientId, user);
  }

  @Post(':id/close')
  @Roles(Role.DOCTOR)
  @Audit('ENCOUNTER_CLOSE', 'Encounter')
  close(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.encountersService.close(id, user);
  }

  @Post(':id/vitals')
  @Roles(Role.DOCTOR, Role.NURSE)
  @Audit('VITALS_CREATE', 'VitalSigns')
  addVitals(
    @Param('id') id: string,
    @Body() dto: CreateVitalsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.encountersService.addVitals(id, dto, user);
  }

  @Post(':id/diagnoses')
  @Roles(Role.DOCTOR)
  @Audit('DIAGNOSIS_CREATE', 'Diagnosis')
  addDiagnosis(
    @Param('id') id: string,
    @Body() dto: CreateDiagnosisDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.encountersService.addDiagnosis(id, dto, user);
  }

  @Post(':id/prescriptions')
  @Roles(Role.DOCTOR)
  @Audit('PRESCRIPTION_CREATE', 'Prescription')
  addPrescription(
    @Param('id') id: string,
    @Body() dto: CreatePrescriptionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.encountersService.addPrescription(id, dto, user);
  }

  @Post(':id/lab-orders')
  @Roles(Role.DOCTOR)
  @Audit('LAB_ORDER_CREATE', 'LabOrder')
  addLabOrder(
    @Param('id') id: string,
    @Body() dto: CreateLabOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.encountersService.addLabOrder(id, dto, user);
  }

  @Post('lab-orders/:labOrderId/result')
  @Roles(Role.LAB_TECH)
  @Audit('LAB_RESULT_CREATE', 'LabResult')
  addLabResult(
    @Param('labOrderId') labOrderId: string,
    @Body() dto: CreateLabResultDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.encountersService.addLabResult(labOrderId, dto, user);
  }

  @Get(':id')
  @Audit('ENCOUNTER_READ', 'Encounter')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.encountersService.findOne(id, user);
  }
}

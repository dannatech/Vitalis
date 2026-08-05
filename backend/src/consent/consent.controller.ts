import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ConsentService } from './consent.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { CreateDataSubjectRequestDto } from './dto/create-data-subject-request.dto';
import { ResolveDataSubjectRequestDto } from './dto/resolve-data-subject-request.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('consent')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Post('records')
  @Audit('CONSENT_RECORD', 'ConsentRecord')
  recordConsent(@Body() dto: CreateConsentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.consentService.recordConsent(dto, user);
  }

  @Get('records')
  @Audit('CONSENT_LIST', 'ConsentRecord')
  listConsents(@Query('patientId') patientId: string) {
    return this.consentService.listConsentsForPatient(patientId);
  }

  @Post('requests')
  @Audit('DSR_CREATE', 'DataSubjectRequest')
  createRequest(@Body() dto: CreateDataSubjectRequestDto) {
    return this.consentService.createDataSubjectRequest(dto);
  }

  @Get('requests')
  @Roles(Role.ADMIN, Role.RECORDS_OFFICER, Role.SUPER_ADMIN)
  @Audit('DSR_LIST', 'DataSubjectRequest')
  listRequests(@Query('patientId') patientId?: string) {
    return this.consentService.listDataSubjectRequests(patientId);
  }

  @Patch('requests/:id')
  @Roles(Role.ADMIN, Role.RECORDS_OFFICER, Role.SUPER_ADMIN)
  @Audit('DSR_RESOLVE', 'DataSubjectRequest')
  resolveRequest(
    @Param('id') id: string,
    @Body() dto: ResolveDataSubjectRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentService.resolveDataSubjectRequest(id, dto, user);
  }

  @Get('patients/:patientId/export')
  @Roles(Role.ADMIN, Role.RECORDS_OFFICER, Role.SUPER_ADMIN)
  @Audit('PATIENT_DATA_EXPORT', 'Patient')
  exportPatientData(
    @Param('patientId') patientId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.consentService.exportPatientData(patientId, user);
  }
}

import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CoverageService } from './coverage.service';
import { CreateCoverageDto } from './dto/create-coverage.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.BILLING_OFFICER, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('billing/patients/:patientId/coverages')
export class CoverageController {
  constructor(private readonly coverageService: CoverageService) {}

  @Post()
  @Audit('COVERAGE_CREATE', 'PatientCoverage')
  create(
    @Param('patientId') patientId: string,
    @Body() dto: CreateCoverageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coverageService.create(patientId, dto, user);
  }

  @Get()
  @Audit('COVERAGE_LIST', 'PatientCoverage')
  findAll(@Param('patientId') patientId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.coverageService.findAllForPatient(patientId, user);
  }
}

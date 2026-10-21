import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { NcdcReportsService } from './ncdc-reports.service';
import { QueryNcdcReportDto } from './dto/query-ncdc-report.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('ncdc-reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ncdc-reports')
export class NcdcReportsController {
  constructor(private readonly ncdcReportsService: NcdcReportsService) {}

  @Get()
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECORDS_OFFICER, Role.ADMIN, Role.SUPER_ADMIN)
  @Audit('NCDC_REPORT_LIST', 'NotifiableDiseaseReport')
  findAll(@Query() query: QueryNcdcReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ncdcReportsService.findAllForFacility(query, user);
  }

  @Post(':id/mark-reported')
  @Roles(Role.RECORDS_OFFICER, Role.ADMIN, Role.SUPER_ADMIN)
  @Audit('NCDC_REPORT_MARK_REPORTED', 'NotifiableDiseaseReport')
  markReported(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ncdcReportsService.markReported(id, user);
  }
}

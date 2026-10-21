import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PharmacyService } from './pharmacy.service';
import { QueryPrescriptionDto } from './dto/query-prescription.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('pharmacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('prescriptions')
  @Roles(Role.PHARMACIST, Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN)
  @Audit('PRESCRIPTION_LIST', 'Prescription')
  findAll(@Query() query: QueryPrescriptionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.pharmacyService.findAllForFacility(query, user);
  }

  @Post('prescriptions/:id/dispense')
  @Roles(Role.PHARMACIST)
  @Audit('PRESCRIPTION_DISPENSE', 'Prescription')
  dispense(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.pharmacyService.dispense(id, user);
  }
}

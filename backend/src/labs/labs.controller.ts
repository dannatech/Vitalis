import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { LabsService } from './labs.service';
import { QueryLabOrderDto } from './dto/query-lab-order.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('labs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.LAB_TECH, Role.DOCTOR, Role.NURSE, Role.ADMIN, Role.SUPER_ADMIN)
@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Get()
  @Audit('LAB_ORDER_LIST', 'LabOrder')
  findAll(@Query() query: QueryLabOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.labsService.findAllForFacility(query, user);
  }
}

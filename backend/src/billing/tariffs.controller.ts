import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { TariffsService } from './tariffs.service';
import { CreateTariffItemDto } from './dto/create-tariff-item.dto';
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
@Controller('billing/tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Post()
  @Audit('TARIFF_CREATE', 'TariffItem')
  create(@Body() dto: CreateTariffItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tariffsService.create(dto, user);
  }

  @Get()
  @Audit('TARIFF_LIST', 'TariffItem')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tariffsService.findAllForFacility(user);
  }
}

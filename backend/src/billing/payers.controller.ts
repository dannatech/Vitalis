import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PayersService } from './payers.service';
import { CreatePayerDto } from './dto/create-payer.dto';
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
@Controller('billing/payers')
export class PayersController {
  constructor(private readonly payersService: PayersService) {}

  @Post()
  @Audit('PAYER_CREATE', 'Payer')
  create(@Body() dto: CreatePayerDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payersService.create(dto, user);
  }

  @Get()
  @Audit('PAYER_LIST', 'Payer')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.payersService.findAllForFacility(user);
  }
}

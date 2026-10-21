import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { AddChargeLineDto } from './dto/add-charge-line.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
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
@Controller('billing/invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @Audit('INVOICE_CREATE', 'Invoice')
  create(@Body() dto: CreateInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.create(dto, user);
  }

  @Get()
  @Audit('INVOICE_LIST', 'Invoice')
  findAll(@Query() query: QueryInvoiceDto, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.findAllForFacility(query, user);
  }

  @Get(':id')
  @Audit('INVOICE_VIEW', 'Invoice')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.findOne(id, user);
  }

  @Post(':id/charge-lines')
  @Audit('CHARGE_LINE_ADD', 'Invoice')
  addChargeLine(
    @Param('id') id: string,
    @Body() dto: AddChargeLineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.addChargeLine(id, dto, user);
  }

  @Delete(':id/charge-lines/:lineId')
  @Audit('CHARGE_LINE_REMOVE', 'Invoice')
  removeChargeLine(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.removeChargeLine(id, lineId, user);
  }

  @Post(':id/finalize')
  @Audit('INVOICE_FINALIZE', 'Invoice')
  finalize(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.finalize(id, user);
  }

  @Post(':id/payments')
  @Audit('PAYMENT_RECORD', 'Invoice')
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invoicesService.recordPayment(id, dto, user);
  }
}

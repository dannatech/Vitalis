import { Body, Controller, Get, Header, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { ClaimsService } from './claims.service';
import { GenerateClaimDto } from './dto/generate-claim.dto';
import { AdjudicateClaimDto } from './dto/adjudicate-claim.dto';
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
@Controller('billing/claims')
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  @Audit('CLAIM_GENERATE', 'Claim')
  generate(@Body() dto: GenerateClaimDto, @CurrentUser() user: AuthenticatedUser) {
    return this.claimsService.generate(dto, user);
  }

  @Get()
  @Audit('CLAIM_LIST', 'Claim')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.claimsService.findAllForFacility(user);
  }

  @Get(':id')
  @Audit('CLAIM_VIEW', 'Claim')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.claimsService.findOne(id, user);
  }

  @Post(':id/submit')
  @Audit('CLAIM_SUBMIT', 'Claim')
  submit(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.claimsService.submit(id, user);
  }

  @Post(':id/adjudicate')
  @Audit('CLAIM_ADJUDICATE', 'Claim')
  adjudicate(
    @Param('id') id: string,
    @Body() dto: AdjudicateClaimDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.claimsService.adjudicate(id, dto, user);
  }

  @Post(':id/mark-paid')
  @Audit('CLAIM_MARK_PAID', 'Claim')
  markPaid(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.claimsService.markPaid(id, user);
  }

  @Get(':id/export.csv')
  @Audit('CLAIM_EXPORT', 'Claim')
  @Header('Content-Type', 'text/csv')
  async exportCsv(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const csv = await this.claimsService.exportCsv(id, user);
    res.setHeader('Content-Disposition', `attachment; filename="claim-${id}.csv"`);
    res.send(csv);
  }
}

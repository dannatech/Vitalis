import { Module } from '@nestjs/common';
import { PayersService } from './payers.service';
import { PayersController } from './payers.controller';
import { TariffsService } from './tariffs.service';
import { TariffsController } from './tariffs.controller';
import { CoverageService } from './coverage.service';
import { CoverageController } from './coverage.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { ClaimsService } from './claims.service';
import { ClaimsController } from './claims.controller';

@Module({
  controllers: [
    PayersController,
    TariffsController,
    CoverageController,
    InvoicesController,
    ClaimsController,
  ],
  providers: [PayersService, TariffsService, CoverageService, InvoicesService, ClaimsService],
  exports: [PayersService],
})
export class BillingModule {}

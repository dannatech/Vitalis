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
import { PaystackService } from './paystack.service';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [
    PayersController,
    TariffsController,
    CoverageController,
    InvoicesController,
    ClaimsController,
    PaystackWebhookController,
  ],
  providers: [
    PayersService,
    TariffsService,
    CoverageService,
    InvoicesService,
    ClaimsService,
    PaystackService,
  ],
  exports: [PayersService],
})
export class BillingModule {}

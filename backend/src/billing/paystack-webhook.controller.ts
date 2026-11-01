import { Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { PaystackService } from './paystack.service';
import { InvoicesService } from './invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getCountry } from '../common/countries';

interface PaystackChargeSuccessPayload {
  event: string;
  data: {
    amount: number;
    reference: string;
    authorization?: { receiver_bank_account_number?: string };
  };
}

/**
 * Receives Paystack's webhook for a confirmed bank-transfer deposit into an
 * invoice's dedicated virtual account and auto-marks the invoice paid — the
 * whole point of this module: a cashier never has to trust a patient's
 * screenshot, only a provider-confirmed, signature-verified deposit.
 *
 * Deliberately public (no JwtAuthGuard) — Paystack calls this directly, not
 * a signed-in browser — and authenticated instead by the HMAC signature in
 * x-paystack-signature. Always returns 200 once the signature and event
 * shape are accepted, even when there's nothing to do (unrecognised event,
 * no matching invoice, already-settled invoice): Paystack retries non-2xx
 * responses, and none of those cases become true on a retry, so a non-200
 * here would just retry-loop forever instead of fixing anything.
 */
@Controller('billing/webhooks')
export class PaystackWebhookController {
  private readonly logger = new Logger(PaystackWebhookController.name);

  constructor(
    private readonly paystack: PaystackService,
    private readonly invoices: InvoicesService,
    private readonly notifications: NotificationsService,
  ) {}

  @Post('paystack')
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string | undefined,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || !this.paystack.verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Rejected a Paystack webhook with an invalid or missing signature');
      return { received: true };
    }

    let payload: PaystackChargeSuccessPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      this.logger.warn('Rejected a Paystack webhook with an unparseable body');
      return { received: true };
    }

    if (payload.event !== 'charge.success') {
      return { received: true };
    }

    const accountNumber = payload.data.authorization?.receiver_bank_account_number;
    if (!accountNumber) {
      return { received: true };
    }

    const result = await this.invoices.recordAutomatedPayment(accountNumber, {
      // Paystack amounts are in the currency's smallest unit (kobo for
      // NGN, cents for GHS/ZAR/KES) — convert to the major unit we store.
      amount: payload.data.amount / 100,
      reference: payload.data.reference,
    });

    if (result) {
      const currencySymbol = getCountry(result.facilityCountry).currencySymbol;
      void this.notifications.notifyRole(
        result.invoice.facilityId,
        [Role.BILLING_OFFICER, Role.ADMIN, Role.SUPER_ADMIN],
        'PAYMENT_RECEIVED',
        `Bank transfer received: ${result.invoice.invoiceNumber ?? 'invoice'} (${currencySymbol}${payload.data.amount / 100})`,
        '/billing',
      );
    }

    return { received: true };
  }
}

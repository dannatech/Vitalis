import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export interface DedicatedVirtualAccount {
  accountNumber: string;
  bankName: string;
  accountName: string;
  /** Paystack's own dedicated_account id — stored for debugging/support,
   *  not used for matching (webhook correlation is by account number). */
  providerRef: string;
}

/**
 * Thin client for Paystack's Dedicated Virtual Account API — mints a
 * temporary bank account per invoice so a patient's transfer can be
 * auto-reconciled by account number via webhook, instead of a cashier
 * trusting a screenshot or SMS alert the patient presents (both are
 * trivially fakeable; a deposit landing in a provider-confirmed account
 * is not).
 *
 * NOTE: field/endpoint names below are per Paystack's published API docs
 * as of this writing (https://paystack.com/docs/payments/dedicated-virtual-accounts/).
 * Verify against their current docs before relying on this in production —
 * dedicated virtual accounts require Paystack business KYC approval, and
 * bank availability (`preferred_bank`) varies by Paystack account tier.
 * Other Nigerian providers (Moniepoint, Providus) offer equivalent
 * dedicated-account products with different APIs; this integration covers
 * Paystack only — swapping providers means a new service behind the same
 * DedicatedVirtualAccount shape, not a rewrite of the invoice/webhook logic.
 */
@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);

  constructor(private readonly config: ConfigService) {}

  private get secretKey(): string | undefined {
    return this.config.get<string>('PAYSTACK_SECRET_KEY');
  }

  isConfigured(): boolean {
    return Boolean(this.secretKey);
  }

  /**
   * Creates a fresh Paystack customer (keyed by a synthetic per-invoice
   * email, not the patient's — we don't reliably have one on file, and
   * reusing a real email would return the SAME existing customer/account
   * instead of a new one, defeating the "unique account per invoice" goal)
   * and assigns it a dedicated virtual account.
   */
  async createVirtualAccountForInvoice(params: {
    invoiceId: string;
    patientFirstName: string;
    patientLastName: string;
    patientPhone?: string | null;
  }): Promise<DedicatedVirtualAccount> {
    if (!this.secretKey) {
      throw new Error('PAYSTACK_SECRET_KEY is not configured');
    }

    const customer = await this.request<{ customer_code: string }>('POST', '/customer', {
      email: `invoice-${params.invoiceId}@vitalis-patients.local`,
      first_name: params.patientFirstName,
      last_name: params.patientLastName,
      phone: params.patientPhone ?? undefined,
    });

    const dva = await this.request<{
      id: number;
      account_number: string;
      account_name: string;
      bank: { name: string };
    }>('POST', '/dedicated_account', {
      customer: customer.customer_code,
      preferred_bank: this.config.get<string>('PAYSTACK_PREFERRED_BANK') ?? 'wema-bank',
    });

    return {
      accountNumber: dva.account_number,
      bankName: dva.bank.name,
      accountName: dva.account_name,
      providerRef: String(dva.id),
    };
  }

  /**
   * Paystack signs each webhook body with HMAC-SHA512 over the raw
   * (unparsed) request bytes, sent in the x-paystack-signature header.
   * Needs the exact bytes as transmitted — see main.ts's rawBody option.
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
    if (!this.secretKey || !signature) return false;
    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex');
    return expected === signature;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await response.json()) as { status: boolean; message?: string; data: T };
    if (!response.ok || json.status === false) {
      this.logger.error(`Paystack ${method} ${path} failed: ${json.message ?? response.statusText}`);
      throw new Error(`Paystack API error (${path}): ${json.message ?? response.statusText}`);
    }
    return json.data;
  }
}

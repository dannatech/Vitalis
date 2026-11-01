import { Test } from '@nestjs/testing';
import { createHmac } from 'crypto';
import { PaystackWebhookController } from './paystack-webhook.controller';
import { PaystackService } from './paystack.service';
import { InvoicesService } from './invoices.service';
import { NotificationsService } from '../notifications/notifications.service';

const SECRET = 'sk_test_123';

function signedRequest(payload: unknown) {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = createHmac('sha512', SECRET).update(rawBody).digest('hex');
  return { req: { rawBody } as any, signature };
}

describe('PaystackWebhookController', () => {
  let controller: PaystackWebhookController;
  let paystack: { verifyWebhookSignature: jest.Mock };
  let invoices: { recordAutomatedPayment: jest.Mock };
  let notifications: { notifyRole: jest.Mock };

  beforeEach(async () => {
    paystack = {
      verifyWebhookSignature: jest.fn((body: Buffer, sig?: string) => {
        if (!sig) return false;
        return createHmac('sha512', SECRET).update(body).digest('hex') === sig;
      }),
    };
    invoices = { recordAutomatedPayment: jest.fn() };
    notifications = { notifyRole: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      controllers: [PaystackWebhookController],
      providers: [
        { provide: PaystackService, useValue: paystack },
        { provide: InvoicesService, useValue: invoices },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    controller = moduleRef.get(PaystackWebhookController);
  });

  it('rejects a request with a missing/invalid signature without touching the invoice', async () => {
    const { req } = signedRequest({ event: 'charge.success', data: {} });

    const result = await controller.handle(req, 'not-the-real-signature');

    expect(result).toEqual({ received: true });
    expect(invoices.recordAutomatedPayment).not.toHaveBeenCalled();
  });

  it('acknowledges but ignores an event type other than charge.success', async () => {
    const { req, signature } = signedRequest({ event: 'transfer.success', data: {} });

    await controller.handle(req, signature);

    expect(invoices.recordAutomatedPayment).not.toHaveBeenCalled();
  });

  it('acknowledges but ignores charge.success with no receiver account number', async () => {
    const { req, signature } = signedRequest({
      event: 'charge.success',
      data: { amount: 100000, reference: 'ref-1', authorization: {} },
    });

    await controller.handle(req, signature);

    expect(invoices.recordAutomatedPayment).not.toHaveBeenCalled();
  });

  it('matches a valid charge.success to the invoice by account number, converts kobo to naira, and notifies billing', async () => {
    const { req, signature } = signedRequest({
      event: 'charge.success',
      data: {
        amount: 500000,
        reference: 'ref-xyz',
        authorization: { receiver_bank_account_number: '1234567890' },
      },
    });
    invoices.recordAutomatedPayment.mockResolvedValue({
      payment: { id: 'payment-1' },
      invoice: { facilityId: 'facility-1', invoiceNumber: 'INV-00005' },
      facilityCountry: 'NG',
    });

    await controller.handle(req, signature);

    expect(invoices.recordAutomatedPayment).toHaveBeenCalledWith('1234567890', {
      amount: 5000,
      reference: 'ref-xyz',
    });
    expect(notifications.notifyRole).toHaveBeenCalledWith(
      'facility-1',
      expect.arrayContaining(['BILLING_OFFICER', 'ADMIN', 'SUPER_ADMIN']),
      'PAYMENT_RECEIVED',
      expect.stringContaining('INV-00005'),
      '/billing',
    );
  });

  it('does not notify when no invoice matched the account number', async () => {
    const { req, signature } = signedRequest({
      event: 'charge.success',
      data: {
        amount: 500000,
        reference: 'ref-xyz',
        authorization: { receiver_bank_account_number: '0000000000' },
      },
    });
    invoices.recordAutomatedPayment.mockResolvedValue(null);

    await controller.handle(req, signature);

    expect(notifications.notifyRole).not.toHaveBeenCalled();
  });
});

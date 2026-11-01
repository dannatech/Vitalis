import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PaystackService } from './paystack.service';

describe('PaystackService', () => {
  let service: PaystackService;
  let config: { get: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    config = { get: jest.fn() };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      providers: [PaystackService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = moduleRef.get(PaystackService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isConfigured', () => {
    it('is false without a secret key', () => {
      config.get.mockReturnValue(undefined);
      expect(service.isConfigured()).toBe(false);
    });

    it('is true once a secret key is set', () => {
      config.get.mockReturnValue('sk_test_123');
      expect(service.isConfigured()).toBe(true);
    });
  });

  describe('createVirtualAccountForInvoice', () => {
    it('throws without a configured secret key, without calling fetch', async () => {
      config.get.mockReturnValue(undefined);

      await expect(
        service.createVirtualAccountForInvoice({
          invoiceId: 'inv-1',
          patientFirstName: 'Amina',
          patientLastName: 'Bello',
        }),
      ).rejects.toThrow('PAYSTACK_SECRET_KEY is not configured');
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('creates a customer keyed by a synthetic per-invoice email, then a dedicated account for them', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'PAYSTACK_SECRET_KEY' ? 'sk_test_123' : undefined,
      );
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ status: true, data: { customer_code: 'CUS_abc' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: true,
            data: {
              id: 999,
              account_number: '1234567890',
              account_name: 'VITALIS/AMINA BELLO',
              bank: { name: 'Wema Bank' },
            },
          }),
        });

      const result = await service.createVirtualAccountForInvoice({
        invoiceId: 'inv-1',
        patientFirstName: 'Amina',
        patientLastName: 'Bello',
      });

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        'https://api.paystack.co/customer',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'invoice-inv-1@vitalis-patients.local',
            first_name: 'Amina',
            last_name: 'Bello',
            phone: undefined,
          }),
        }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        'https://api.paystack.co/dedicated_account',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ customer: 'CUS_abc', preferred_bank: 'wema-bank' }),
        }),
      );
      expect(result).toEqual({
        accountNumber: '1234567890',
        bankName: 'Wema Bank',
        accountName: 'VITALIS/AMINA BELLO',
        providerRef: '999',
      });
    });

    it('throws when Paystack returns an error response', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'PAYSTACK_SECRET_KEY' ? 'sk_test_123' : undefined,
      );
      fetchMock.mockResolvedValue({
        ok: false,
        json: async () => ({ status: false, message: 'Invalid key' }),
      });

      await expect(
        service.createVirtualAccountForInvoice({
          invoiceId: 'inv-1',
          patientFirstName: 'Amina',
          patientLastName: 'Bello',
        }),
      ).rejects.toThrow('Invalid key');
    });
  });

  describe('verifyWebhookSignature', () => {
    it('accepts a signature computed with the configured secret key', () => {
      config.get.mockReturnValue('sk_test_123');
      const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
      const signature = createHmac('sha512', 'sk_test_123').update(body).digest('hex');

      expect(service.verifyWebhookSignature(body, signature)).toBe(true);
    });

    it('rejects a signature computed with the wrong key', () => {
      config.get.mockReturnValue('sk_test_123');
      const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
      const wrongSignature = createHmac('sha512', 'some-other-key').update(body).digest('hex');

      expect(service.verifyWebhookSignature(body, wrongSignature)).toBe(false);
    });

    it('rejects when no signature is given', () => {
      config.get.mockReturnValue('sk_test_123');
      const body = Buffer.from('{}');

      expect(service.verifyWebhookSignature(body, undefined)).toBe(false);
    });

    it('rejects everything when no secret key is configured', () => {
      config.get.mockReturnValue(undefined);
      const body = Buffer.from('{}');

      expect(service.verifyWebhookSignature(body, 'anything')).toBe(false);
    });
  });
});

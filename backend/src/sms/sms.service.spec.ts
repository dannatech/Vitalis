import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SmsService } from './sms.service';

describe('SmsService', () => {
  let service: SmsService;
  let config: { get: jest.Mock };
  let fetchMock: jest.Mock;

  beforeEach(async () => {
    config = { get: jest.fn() };
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      providers: [SmsService, { provide: ConfigService, useValue: config }],
    }).compile();

    service = moduleRef.get(SmsService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips sending without throwing when Termii credentials are not configured', async () => {
    config.get.mockReturnValue(undefined);

    await service.send('+2348012345678', 'hello');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('posts to Termii with the normalised phone number and configured sender', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'TERMII_API_KEY' ? 'test-api-key' : key === 'TERMII_SENDER_ID' ? 'Vitalis' : undefined,
    );
    fetchMock.mockResolvedValue({ ok: true });

    await service.send('+2348012345678', 'Visit summary');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.ng.termii.com/api/sms/send',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          to: '2348012345678',
          from: 'Vitalis',
          sms: 'Visit summary',
          type: 'plain',
          channel: 'generic',
          api_key: 'test-api-key',
        }),
      }),
    );
  });

  it('does not throw when Termii responds with a non-2xx status', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'TERMII_API_KEY' ? 'test-api-key' : key === 'TERMII_SENDER_ID' ? 'Vitalis' : undefined,
    );
    fetchMock.mockResolvedValue({ ok: false, status: 401, text: async () => 'invalid api key' });

    await expect(service.send('+2348012345678', 'hello')).resolves.toBeUndefined();
  });

  it('does not throw when the network request itself fails', async () => {
    config.get.mockImplementation((key: string) =>
      key === 'TERMII_API_KEY' ? 'test-api-key' : key === 'TERMII_SENDER_ID' ? 'Vitalis' : undefined,
    );
    fetchMock.mockRejectedValue(new Error('network down'));

    await expect(service.send('+2348012345678', 'hello')).resolves.toBeUndefined();
  });
});

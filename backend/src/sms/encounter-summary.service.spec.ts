import { Test } from '@nestjs/testing';
import { EncounterSummaryService } from './encounter-summary.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { SmsService } from './sms.service';

describe('EncounterSummaryService', () => {
  let service: EncounterSummaryService;
  let prisma: { encounter: { findUnique: jest.Mock } };
  let encryption: { decrypt: jest.Mock };
  let sms: { send: jest.Mock };

  beforeEach(async () => {
    prisma = { encounter: { findUnique: jest.fn() } };
    encryption = { decrypt: jest.fn() };
    sms = { send: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EncounterSummaryService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
        { provide: SmsService, useValue: sms },
      ],
    }).compile();

    service = moduleRef.get(EncounterSummaryService);
  });

  it('decrypts the patient phone and sends a built summary message', async () => {
    prisma.encounter.findUnique.mockResolvedValue({
      visitDate: new Date('2026-03-14T10:00:00Z'),
      notes: null,
      facility: { name: 'Demo General Hospital' },
      diagnoses: [{ description: 'Malaria' }],
      prescriptions: [{ medicationName: 'Artemether/Lumefantrine' }],
      patient: { phoneEncrypted: 'encrypted-payload' },
    });
    encryption.decrypt.mockReturnValue('+2348012345678');

    await service.notifyEncounterClosed('encounter-1');

    expect(encryption.decrypt).toHaveBeenCalledWith('encrypted-payload');
    expect(sms.send).toHaveBeenCalledTimes(1);
    const [toArg, messageArg] = sms.send.mock.calls[0];
    expect(toArg).toBe('+2348012345678');
    expect(messageArg).toContain('Malaria');
    expect(messageArg).toContain('Artemether/Lumefantrine');
  });

  it('does nothing when the encounter has no patient phone on file', async () => {
    prisma.encounter.findUnique.mockResolvedValue({
      visitDate: new Date(),
      notes: null,
      facility: { name: 'Demo General Hospital' },
      diagnoses: [],
      prescriptions: [],
      patient: { phoneEncrypted: null },
    });

    await service.notifyEncounterClosed('encounter-1');

    expect(sms.send).not.toHaveBeenCalled();
  });

  it('does nothing when the encounter no longer exists', async () => {
    prisma.encounter.findUnique.mockResolvedValue(null);

    await service.notifyEncounterClosed('encounter-1');

    expect(sms.send).not.toHaveBeenCalled();
  });

  it('swallows errors instead of throwing, so a failure never bubbles to the caller', async () => {
    prisma.encounter.findUnique.mockRejectedValue(new Error('db down'));

    await expect(service.notifyEncounterClosed('encounter-1')).resolves.toBeUndefined();
  });
});

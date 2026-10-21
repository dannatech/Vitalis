import { Test } from '@nestjs/testing';
import { Role, Sex } from '@prisma/client';
import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import type { AuthenticatedUser } from '../auth/auth.types';

function makeActor(role: Role): AuthenticatedUser {
  return { id: 'actor-1', email: 'actor@test.ng', role, facilityId: 'facility-1' };
}

const RAW_PATIENT = {
  id: 'patient-1',
  facilityId: 'facility-1',
  mrn: 'MRN-001',
  ninEncrypted: 'encrypted-nin-blob',
  nhisNumber: null,
  surname: 'Adeyemi',
  firstName: 'Folake',
  otherNames: null,
  dateOfBirth: new Date('1990-03-14'),
  sex: Sex.FEMALE,
  phoneEncrypted: 'encrypted-phone-blob',
  address: null,
  state: 'Lagos',
  lga: 'Eti-Osa',
  nextOfKinName: null,
  nextOfKinPhone: null,
  nextOfKinRelation: null,
  bloodGroup: 'O+',
  genotype: 'AA',
  registeredById: null,
  anonymisedAt: null,
  clientGeneratedId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  deletedAt: null,
};

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: { patient: { findFirst: jest.Mock; update: jest.Mock } };
  let encryption: { encrypt: jest.Mock; decrypt: jest.Mock };

  beforeEach(async () => {
    prisma = { patient: { findFirst: jest.fn(), update: jest.fn() } };
    encryption = {
      encrypt: jest.fn((v: string) => `enc(${v})`),
      decrypt: jest.fn((v: string) => (v === 'encrypted-nin-blob' ? '12345678901' : '08012345678')),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
    }).compile();

    service = moduleRef.get(PatientsService);
  });

  describe('NDPR-sensitive field redaction', () => {
    // NIN is a national identifier — only roles with a legitimate records/
    // clinical need should ever see the decrypted value. This is the
    // behaviour COMPLIANCE.md documents; regression-testing it directly
    // because it's a privacy control, not just a feature.
    it.each([Role.SUPER_ADMIN, Role.ADMIN, Role.RECORDS_OFFICER, Role.DOCTOR])(
      'reveals the decrypted NIN to %s',
      async (role) => {
        prisma.patient.findFirst.mockResolvedValue(RAW_PATIENT);

        const result = await service.findOne('patient-1', makeActor(role));

        expect(result.nin).toBe('12345678901');
      },
    );

    it.each([Role.NURSE, Role.PHARMACIST, Role.LAB_TECH, Role.BILLING_OFFICER])(
      'redacts the NIN from %s',
      async (role) => {
        prisma.patient.findFirst.mockResolvedValue(RAW_PATIENT);

        const result = await service.findOne('patient-1', makeActor(role));

        expect(result.nin).toBe('***REDACTED***');
      },
    );

    it('decrypts phone for every role (not access-restricted the same way)', async () => {
      prisma.patient.findFirst.mockResolvedValue(RAW_PATIENT);

      const result = await service.findOne('patient-1', makeActor(Role.NURSE));

      expect(result.phone).toBe('08012345678');
    });

    it('returns null NIN (not the redaction marker) when none was recorded', async () => {
      prisma.patient.findFirst.mockResolvedValue({ ...RAW_PATIENT, ninEncrypted: null });

      const result = await service.findOne('patient-1', makeActor(Role.NURSE));

      expect(result.nin).toBeNull();
    });
  });

  describe('anonymise', () => {
    it('scrubs direct identifiers but leaves the record retrievable', async () => {
      prisma.patient.update.mockResolvedValue({ ...RAW_PATIENT, surname: 'ERASED-patient-' });

      await service.anonymise('patient-1');

      expect(prisma.patient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'patient-1' },
          data: expect.objectContaining({
            otherNames: null,
            ninEncrypted: null,
            phoneEncrypted: null,
            address: null,
            nextOfKinName: null,
            nextOfKinPhone: null,
            nextOfKinRelation: null,
          }),
        }),
      );
      // anonymisedAt must be set so a resolved erasure request is auditable.
      const call = prisma.patient.update.mock.calls[0][0];
      expect(call.data.anonymisedAt).toBeInstanceOf(Date);
    });
  });
});

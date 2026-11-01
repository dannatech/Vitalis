import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { SyncService } from './sync.service';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { EncountersService } from '../encounters/encounters.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'doctor-1',
  email: 'doctor@test.ng',
  role: Role.DOCTOR,
  facilityId: 'facility-1',
};

describe('SyncService.push', () => {
  let service: SyncService;
  let patientsService: { create: jest.Mock };
  let encountersService: {
    create: jest.Mock;
    addVitals: jest.Mock;
    addDiagnosis: jest.Mock;
    addPrescription: jest.Mock;
    addLabOrder: jest.Mock;
  };

  beforeEach(async () => {
    patientsService = { create: jest.fn() };
    encountersService = {
      create: jest.fn(),
      addVitals: jest.fn(),
      addDiagnosis: jest.fn(),
      addPrescription: jest.fn(),
      addLabOrder: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SyncService,
        { provide: PrismaService, useValue: {} },
        { provide: PatientsService, useValue: patientsService },
        { provide: EncountersService, useValue: encountersService },
      ],
    }).compile();

    service = moduleRef.get(SyncService);
  });

  it('pushes a vitals record and reports its server id against the client id', async () => {
    encountersService.addVitals.mockResolvedValue({ id: 'vitals-1' });

    const result = await service.push(
      { vitals: [{ encounterId: 'encounter-1', temperatureC: 37.5, clientGeneratedId: 'cv-1' }] },
      ACTOR,
    );

    expect(encountersService.addVitals).toHaveBeenCalledWith(
      'encounter-1',
      { temperatureC: 37.5, clientGeneratedId: 'cv-1' },
      ACTOR,
    );
    expect(result.vitals).toEqual([{ clientGeneratedId: 'cv-1', serverId: 'vitals-1', status: 'ok' }]);
  });

  it('isolates a failure in one diagnosis push from the rest of the batch', async () => {
    encountersService.addDiagnosis
      .mockRejectedValueOnce(new Error('Encounter not found'))
      .mockResolvedValueOnce({ id: 'diagnosis-2' });

    const result = await service.push(
      {
        diagnoses: [
          { encounterId: 'bad-encounter', icd10Code: 'A00', description: 'x', clientGeneratedId: 'cd-1' },
          { encounterId: 'encounter-1', icd10Code: 'B50', description: 'y', clientGeneratedId: 'cd-2' },
        ],
      },
      ACTOR,
    );

    expect(result.diagnoses).toEqual([
      { clientGeneratedId: 'cd-1', status: 'error', error: 'Encounter not found' },
      { clientGeneratedId: 'cd-2', serverId: 'diagnosis-2', status: 'ok' },
    ]);
  });

  it('rejects a prescription push with no clientGeneratedId without calling the service', async () => {
    const result = await service.push(
      {
        prescriptions: [
          {
            encounterId: 'encounter-1',
            medicationName: 'x',
            dosage: 'x',
            frequency: 'x',
            durationDays: 1,
            route: 'x',
          } as never,
        ],
      },
      ACTOR,
    );

    expect(result.prescriptions).toEqual([
      { clientGeneratedId: '', status: 'error', error: 'clientGeneratedId is required for offline sync' },
    ]);
    expect(encountersService.addPrescription).not.toHaveBeenCalled();
  });

  it('pushes a lab order and reports its server id', async () => {
    encountersService.addLabOrder.mockResolvedValue({ id: 'lo-1' });

    const result = await service.push(
      { labOrders: [{ encounterId: 'encounter-1', testName: 'FBC', clientGeneratedId: 'cl-1' }] },
      ACTOR,
    );

    expect(result.labOrders).toEqual([{ clientGeneratedId: 'cl-1', serverId: 'lo-1', status: 'ok' }]);
  });

  it('returns empty arrays for every record type when the push batch is empty', async () => {
    const result = await service.push({}, ACTOR);

    expect(result).toEqual({
      patients: [],
      encounters: [],
      vitals: [],
      diagnoses: [],
      prescriptions: [],
      labOrders: [],
    });
  });
});

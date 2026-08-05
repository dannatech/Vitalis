import { Injectable, NotFoundException } from '@nestjs/common';
import { EncounterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateEncounterDto } from './dto/create-encounter.dto';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateDiagnosisDto } from './dto/create-diagnosis.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreateLabOrderDto } from './dto/create-lab-order.dto';
import { CreateLabResultDto } from './dto/create-lab-result.dto';

@Injectable()
export class EncountersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEncounterDto, actor: AuthenticatedUser) {
    if (dto.clientGeneratedId) {
      const existing = await this.prisma.encounter.findUnique({
        where: { clientGeneratedId: dto.clientGeneratedId },
      });
      if (existing) return existing;
    }

    return this.prisma.encounter.create({
      data: {
        facilityId: actor.facilityId,
        patientId: dto.patientId,
        clinicianId: actor.id,
        type: dto.type,
        chiefComplaint: dto.chiefComplaint,
        notes: dto.notes,
        clientGeneratedId: dto.clientGeneratedId,
      },
    });
  }

  async findAllForPatient(patientId: string, actor: AuthenticatedUser) {
    return this.prisma.encounter.findMany({
      where: { patientId, facilityId: actor.facilityId },
      orderBy: { visitDate: 'desc' },
    });
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId: actor.facilityId },
      include: {
        vitals: true,
        diagnoses: { include: { notifiableDisease: true } },
        prescriptions: true,
        labOrders: { include: { result: true } },
      },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');
    return encounter;
  }

  async close(id: string, actor: AuthenticatedUser) {
    await this.assertEncounterInFacility(id, actor);
    return this.prisma.encounter.update({
      where: { id },
      data: { status: EncounterStatus.CLOSED },
    });
  }

  async addVitals(encounterId: string, dto: CreateVitalsDto, actor: AuthenticatedUser) {
    await this.assertEncounterInFacility(encounterId, actor);
    return this.prisma.vitalSigns.create({
      data: { encounterId, ...dto, recordedById: actor.id },
    });
  }

  /**
   * Records a diagnosis and, if its ICD-10 code matches the seeded NCDC
   * notifiable-disease reference table, automatically opens a
   * NotifiableDiseaseReport worklist item — see COMPLIANCE.md §4.
   */
  async addDiagnosis(encounterId: string, dto: CreateDiagnosisDto, actor: AuthenticatedUser) {
    const encounter = await this.assertEncounterInFacility(encounterId, actor);

    const notifiableDisease = await this.prisma.notifiableDisease.findUnique({
      where: { icd10Code: dto.icd10Code },
    });

    const diagnosis = await this.prisma.diagnosis.create({
      data: {
        encounterId,
        icd10Code: dto.icd10Code,
        description: dto.description,
        notedById: actor.id,
        notifiableDiseaseId: notifiableDisease?.id,
      },
    });

    if (notifiableDisease) {
      await this.prisma.notifiableDiseaseReport.create({
        data: {
          diagnosisId: diagnosis.id,
          patientId: encounter.patientId,
          facilityId: encounter.facilityId,
        },
      });
    }

    return diagnosis;
  }

  async addPrescription(
    encounterId: string,
    dto: CreatePrescriptionDto,
    actor: AuthenticatedUser,
  ) {
    await this.assertEncounterInFacility(encounterId, actor);
    return this.prisma.prescription.create({
      data: { encounterId, ...dto, prescribedById: actor.id },
    });
  }

  async addLabOrder(encounterId: string, dto: CreateLabOrderDto, actor: AuthenticatedUser) {
    await this.assertEncounterInFacility(encounterId, actor);
    return this.prisma.labOrder.create({
      data: { encounterId, testName: dto.testName, orderedById: actor.id },
    });
  }

  async addLabResult(labOrderId: string, dto: CreateLabResultDto, actor: AuthenticatedUser) {
    const order = await this.prisma.labOrder.findFirst({
      where: { id: labOrderId, encounter: { facilityId: actor.facilityId } },
    });
    if (!order) throw new NotFoundException('Lab order not found');

    const [result] = await this.prisma.$transaction([
      this.prisma.labResult.create({
        data: { labOrderId, ...dto, resultedById: actor.id },
      }),
      this.prisma.labOrder.update({
        where: { id: labOrderId },
        data: { status: 'RESULTED' },
      }),
    ]);
    return result;
  }

  private async assertEncounterInFacility(id: string, actor: AuthenticatedUser) {
    const encounter = await this.prisma.encounter.findFirst({
      where: { id, facilityId: actor.facilityId },
    });
    if (!encounter) throw new NotFoundException('Encounter not found');
    return encounter;
  }
}

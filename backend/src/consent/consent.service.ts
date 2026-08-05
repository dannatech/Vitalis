import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSubjectRequestStatus, DataSubjectRequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateConsentDto } from './dto/create-consent.dto';
import { CreateDataSubjectRequestDto } from './dto/create-data-subject-request.dto';
import { ResolveDataSubjectRequestDto } from './dto/resolve-data-subject-request.dto';

@Injectable()
export class ConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
  ) {}

  recordConsent(dto: CreateConsentDto, actor: AuthenticatedUser) {
    return this.prisma.consentRecord.create({
      data: {
        patientId: dto.patientId,
        purpose: dto.purpose,
        granted: dto.granted,
        method: dto.method,
        notes: dto.notes,
        grantedAt: dto.granted ? new Date() : null,
        revokedAt: !dto.granted ? new Date() : null,
        recordedById: actor.id,
      },
    });
  }

  listConsentsForPatient(patientId: string) {
    return this.prisma.consentRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  createDataSubjectRequest(dto: CreateDataSubjectRequestDto) {
    return this.prisma.dataSubjectRequest.create({
      data: {
        patientId: dto.patientId,
        type: dto.type,
        notes: dto.notes,
      },
    });
  }

  listDataSubjectRequests(patientId?: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: patientId ? { patientId } : undefined,
      orderBy: { requestedAt: 'desc' },
    });
  }

  /**
   * Resolves a data-subject request. For ERASURE requests being marked
   * RESOLVED, this triggers anonymisation of the patient record rather than
   * a hard delete — medical records must be retained; see COMPLIANCE.md §3.
   */
  async resolveDataSubjectRequest(
    id: string,
    dto: ResolveDataSubjectRequestDto,
    actor: AuthenticatedUser,
  ) {
    const request = await this.prisma.dataSubjectRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Data subject request not found');
    }
    if (request.status === DataSubjectRequestStatus.RESOLVED) {
      throw new BadRequestException('Request has already been resolved');
    }

    if (
      request.type === DataSubjectRequestType.ERASURE &&
      dto.status === DataSubjectRequestStatus.RESOLVED
    ) {
      await this.patientsService.anonymise(request.patientId);
    }

    return this.prisma.dataSubjectRequest.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes ?? request.notes,
        resolvedAt:
          dto.status === DataSubjectRequestStatus.RESOLVED ||
          dto.status === DataSubjectRequestStatus.REJECTED
            ? new Date()
            : null,
        handledById: actor.id,
      },
    });
  }

  /**
   * Produces a full export of everything held about a patient, fulfilling
   * the NDPR right of access. See COMPLIANCE.md §1.
   */
  async exportPatientData(patientId: string, actor: AuthenticatedUser) {
    const patient = await this.patientsService.findOne(patientId, actor);

    const [encounters, consents, requests] = await Promise.all([
      this.prisma.encounter.findMany({
        where: { patientId },
        include: {
          vitals: true,
          diagnoses: true,
          prescriptions: true,
          labOrders: { include: { result: true } },
        },
      }),
      this.prisma.consentRecord.findMany({ where: { patientId } }),
      this.prisma.dataSubjectRequest.findMany({ where: { patientId } }),
    ]);

    return { patient, encounters, consentRecords: consents, dataSubjectRequests: requests };
  }
}

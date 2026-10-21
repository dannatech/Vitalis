import { Injectable, NotFoundException } from '@nestjs/common';
import { PatientCoverage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateCoverageDto } from './dto/create-coverage.dto';

@Injectable()
export class CoverageService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPatientInFacility(patientId: string, actor: AuthenticatedUser) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, facilityId: actor.facilityId },
    });
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  async create(
    patientId: string,
    dto: CreateCoverageDto,
    actor: AuthenticatedUser,
  ): Promise<PatientCoverage> {
    await this.assertPatientInFacility(patientId, actor);

    return this.prisma.patientCoverage.create({
      data: {
        patientId,
        payerId: dto.payerId,
        enrolleeId: dto.enrolleeId,
        planName: dto.planName,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo: dto.validTo ? new Date(dto.validTo) : undefined,
        isPrimary: dto.isPrimary ?? true,
      },
    });
  }

  async findAllForPatient(
    patientId: string,
    actor: AuthenticatedUser,
  ): Promise<(PatientCoverage & { payer: { name: string; type: string } })[]> {
    await this.assertPatientInFacility(patientId, actor);

    return this.prisma.patientCoverage.findMany({
      where: { patientId },
      include: { payer: { select: { name: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}

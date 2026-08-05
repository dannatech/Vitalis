import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Patient, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/crypto/encryption.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { QueryPatientDto } from './dto/query-patient.dto';
import { AuthenticatedUser } from '../auth/auth.types';

const ROLES_ALLOWED_TO_VIEW_NIN: Role[] = [
  Role.SUPER_ADMIN,
  Role.ADMIN,
  Role.RECORDS_OFFICER,
  Role.DOCTOR,
];

@Injectable()
export class PatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async create(dto: CreatePatientDto, actor: AuthenticatedUser) {
    if (dto.clientGeneratedId) {
      const existing = await this.prisma.patient.findUnique({
        where: { clientGeneratedId: dto.clientGeneratedId },
      });
      if (existing) {
        return this.toResponse(existing, actor.role);
      }
    }

    const duplicateMrn = await this.prisma.patient.findUnique({
      where: { facilityId_mrn: { facilityId: actor.facilityId, mrn: dto.mrn } },
    });
    if (duplicateMrn) {
      throw new ConflictException(`MRN ${dto.mrn} already exists at this facility`);
    }

    const patient = await this.prisma.patient.create({
      data: {
        facilityId: actor.facilityId,
        mrn: dto.mrn,
        ninEncrypted: dto.nin ? this.encryption.encrypt(dto.nin) : null,
        nhisNumber: dto.nhisNumber,
        surname: dto.surname,
        firstName: dto.firstName,
        otherNames: dto.otherNames,
        dateOfBirth: new Date(dto.dateOfBirth),
        sex: dto.sex,
        phoneEncrypted: dto.phone ? this.encryption.encrypt(dto.phone) : null,
        address: dto.address,
        state: dto.state,
        lga: dto.lga,
        nextOfKinName: dto.nextOfKinName,
        nextOfKinPhone: dto.nextOfKinPhone,
        nextOfKinRelation: dto.nextOfKinRelation,
        bloodGroup: dto.bloodGroup,
        genotype: dto.genotype,
        registeredById: actor.id,
        clientGeneratedId: dto.clientGeneratedId,
      },
    });

    return this.toResponse(patient, actor.role);
  }

  async findAll(query: QueryPatientDto, actor: AuthenticatedUser) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const where = {
      facilityId: actor.facilityId,
      deletedAt: null,
      ...(query.search
        ? {
            OR: [
              { surname: { contains: query.search, mode: 'insensitive' as const } },
              { firstName: { contains: query.search, mode: 'insensitive' as const } },
              { mrn: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.patient.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.patient.count({ where }),
    ]);

    return {
      items: items.map((p) => this.toResponse(p, actor.role)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, facilityId: actor.facilityId, deletedAt: null },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
    return this.toResponse(patient, actor.role);
  }

  async update(id: string, dto: UpdatePatientDto, actor: AuthenticatedUser) {
    await this.findOne(id, actor);

    const patient = await this.prisma.patient.update({
      where: { id },
      data: {
        ...(dto.mrn !== undefined ? { mrn: dto.mrn } : {}),
        ...(dto.nin !== undefined ? { ninEncrypted: this.encryption.encrypt(dto.nin) } : {}),
        ...(dto.nhisNumber !== undefined ? { nhisNumber: dto.nhisNumber } : {}),
        ...(dto.surname !== undefined ? { surname: dto.surname } : {}),
        ...(dto.firstName !== undefined ? { firstName: dto.firstName } : {}),
        ...(dto.otherNames !== undefined ? { otherNames: dto.otherNames } : {}),
        ...(dto.dateOfBirth !== undefined ? { dateOfBirth: new Date(dto.dateOfBirth) } : {}),
        ...(dto.sex !== undefined ? { sex: dto.sex } : {}),
        ...(dto.phone !== undefined ? { phoneEncrypted: this.encryption.encrypt(dto.phone) } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.state !== undefined ? { state: dto.state } : {}),
        ...(dto.lga !== undefined ? { lga: dto.lga } : {}),
        ...(dto.nextOfKinName !== undefined ? { nextOfKinName: dto.nextOfKinName } : {}),
        ...(dto.nextOfKinPhone !== undefined ? { nextOfKinPhone: dto.nextOfKinPhone } : {}),
        ...(dto.nextOfKinRelation !== undefined
          ? { nextOfKinRelation: dto.nextOfKinRelation }
          : {}),
        ...(dto.bloodGroup !== undefined ? { bloodGroup: dto.bloodGroup } : {}),
        ...(dto.genotype !== undefined ? { genotype: dto.genotype } : {}),
      },
    });

    return this.toResponse(patient, actor.role);
  }

  /**
   * Fulfils an NDPR erasure request by anonymising directly-identifying
   * fields while preserving clinical content for legal retention and
   * public-health reporting. See COMPLIANCE.md §3.
   */
  async anonymise(id: string): Promise<Patient> {
    const token = `ERASED-${id.slice(0, 8)}`;
    return this.prisma.patient.update({
      where: { id },
      data: {
        surname: token,
        firstName: token,
        otherNames: null,
        ninEncrypted: null,
        phoneEncrypted: null,
        address: null,
        nextOfKinName: null,
        nextOfKinPhone: null,
        nextOfKinRelation: null,
        anonymisedAt: new Date(),
      },
    });
  }

  private toResponse(patient: Patient, viewerRole: Role) {
    const canViewNin = ROLES_ALLOWED_TO_VIEW_NIN.includes(viewerRole);
    return {
      id: patient.id,
      facilityId: patient.facilityId,
      mrn: patient.mrn,
      nin: patient.ninEncrypted
        ? canViewNin
          ? this.encryption.decrypt(patient.ninEncrypted)
          : '***REDACTED***'
        : null,
      nhisNumber: patient.nhisNumber,
      surname: patient.surname,
      firstName: patient.firstName,
      otherNames: patient.otherNames,
      dateOfBirth: patient.dateOfBirth,
      sex: patient.sex,
      phone: patient.phoneEncrypted ? this.encryption.decrypt(patient.phoneEncrypted) : null,
      address: patient.address,
      state: patient.state,
      lga: patient.lga,
      nextOfKinName: patient.nextOfKinName,
      nextOfKinPhone: patient.nextOfKinPhone,
      nextOfKinRelation: patient.nextOfKinRelation,
      bloodGroup: patient.bloodGroup,
      genotype: patient.genotype,
      anonymisedAt: patient.anonymisedAt,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }
}

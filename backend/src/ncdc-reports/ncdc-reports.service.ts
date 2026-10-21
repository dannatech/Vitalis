import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { QueryNcdcReportDto } from './dto/query-ncdc-report.dto';

@Injectable()
export class NcdcReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Facility-wide worklist of diagnoses flagged against the NCDC IDSR
   * priority disease list (see EncountersService.addDiagnosis for where
   * these get created). This is the list a records officer works through
   * to actually phone/file each report within its regulatory window —
   * see COMPLIANCE.md §4.
   */
  async findAllForFacility(query: QueryNcdcReportDto, actor: AuthenticatedUser) {
    const reports = await this.prisma.notifiableDiseaseReport.findMany({
      where: {
        facilityId: actor.facilityId,
        ...(query.status === 'pending' ? { reportedToNCDC: false } : {}),
        ...(query.status === 'reported' ? { reportedToNCDC: true } : {}),
      },
      include: {
        patient: { select: { id: true, mrn: true, surname: true, firstName: true } },
        diagnosis: {
          select: {
            icd10Code: true,
            description: true,
            notedAt: true,
            notifiableDisease: { select: { name: true, reportingTimeframe: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports.map((report) => ({
      id: report.id,
      patient: report.patient,
      icd10Code: report.diagnosis.icd10Code,
      diagnosisDescription: report.diagnosis.description,
      diseaseName: report.diagnosis.notifiableDisease?.name ?? report.diagnosis.icd10Code,
      reportingTimeframe: report.diagnosis.notifiableDisease?.reportingTimeframe ?? null,
      notedAt: report.diagnosis.notedAt,
      reportedToNCDC: report.reportedToNCDC,
      reportedAt: report.reportedAt,
      createdAt: report.createdAt,
    }));
  }

  async markReported(id: string, actor: AuthenticatedUser) {
    const report = await this.prisma.notifiableDiseaseReport.findFirst({
      where: { id, facilityId: actor.facilityId },
    });
    if (!report) {
      throw new NotFoundException('Notifiable disease report not found');
    }
    if (report.reportedToNCDC) {
      throw new BadRequestException('This report has already been marked as reported');
    }

    return this.prisma.notifiableDiseaseReport.update({
      where: { id },
      data: { reportedToNCDC: true, reportedAt: new Date() },
    });
  }
}

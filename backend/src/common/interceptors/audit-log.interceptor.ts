import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_KEY, AuditMetadata } from '../decorators/audit.decorator';
import { AuthenticatedUser } from '../../auth/auth.types';

/**
 * Writes an append-only AuditLog row for every request whose handler is
 * annotated with @Audit(...). Required for NDPR accountability — see
 * COMPLIANCE.md §1. Logging failures never block the response; they are
 * swallowed after being written to stderr so an audit-log outage cannot
 * become a clinical-workflow outage, but is still surfaced operationally.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.getAllAndOverride<AuditMetadata | undefined>(AUDIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    return next.handle().pipe(
      tap((responseBody) => {
        this.writeAuditLog(meta, request, user, responseBody).catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error('Failed to write audit log', err);
        });
      }),
    );
  }

  private async writeAuditLog(
    meta: AuditMetadata,
    request: any,
    user: AuthenticatedUser | undefined,
    responseBody: unknown,
  ) {
    const entityId =
      (responseBody && typeof responseBody === 'object' && 'id' in responseBody
        ? (responseBody as { id?: string }).id
        : undefined) ?? request.params?.id;

    let patientId: string | undefined =
      (responseBody && typeof responseBody === 'object' && 'patientId' in responseBody
        ? (responseBody as { patientId?: string }).patientId
        : undefined) ??
      request.params?.patientId ??
      request.body?.patientId ??
      (meta.entityType === 'Patient' ? entityId : undefined);

    // Sub-resources of an encounter (vitals, diagnoses, prescriptions, lab
    // orders/results) only carry encounterId — resolve the patient via the
    // encounter so every audit row can still be traced to a patient.
    if (!patientId) {
      const encounterId =
        (responseBody && typeof responseBody === 'object' && 'encounterId' in responseBody
          ? (responseBody as { encounterId?: string }).encounterId
          : undefined) ?? request.params?.id;

      if (encounterId) {
        const encounter = await this.prisma.encounter
          .findUnique({ where: { id: encounterId }, select: { patientId: true } })
          .catch(() => null);
        patientId = encounter?.patientId;
      } else if (request.params?.labOrderId) {
        const labOrder = await this.prisma.labOrder
          .findUnique({
            where: { id: request.params.labOrderId },
            select: { encounter: { select: { patientId: true } } },
          })
          .catch(() => null);
        patientId = labOrder?.encounter.patientId;
      }
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: user?.id,
        actorRole: user?.role,
        facilityId: user?.facilityId,
        action: meta.action,
        entityType: meta.entityType,
        entityId,
        patientId,
        ipAddress: request.ip,
      },
    });
  }
}

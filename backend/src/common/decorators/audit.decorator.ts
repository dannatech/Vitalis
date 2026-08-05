import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: string;
  entityType: string;
}

/**
 * Marks a controller method as touching patient data so the global
 * AuditLogInterceptor records who accessed/changed what (NDPR accountability
 * requirement — see COMPLIANCE.md §1).
 */
export const Audit = (action: string, entityType: string) =>
  SetMetadata(AUDIT_KEY, { action, entityType } as AuditMetadata);

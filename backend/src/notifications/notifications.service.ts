import { Injectable, Logger } from '@nestjs/common';
import { NotificationType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Notifies a single user — e.g. the doctor who ordered a lab test, once
   * its result is in. Fire-and-forget: callers invoke this with `void` and
   * it never throws, so a notification failure can't break the clinical
   * action that triggered it (same rationale as EncounterSummaryService's
   * SMS sends).
   */
  async notifyUser(
    facilityId: string,
    userId: string,
    type: NotificationType,
    message: string,
    link?: string,
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { facilityId, userId, type, message, link },
      });
    } catch (err) {
      this.logger.error(
        `Failed to create notification for user ${userId}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  /**
   * Notifies every active user at the facility holding any of the given
   * roles — e.g. every lab tech, when a new test is ordered. Same
   * fire-and-forget contract as notifyUser.
   */
  async notifyRole(
    facilityId: string,
    roles: Role | Role[],
    type: NotificationType,
    message: string,
    link?: string,
  ): Promise<void> {
    try {
      const roleList = Array.isArray(roles) ? roles : [roles];
      const recipients = await this.prisma.user.findMany({
        where: { facilityId, role: { in: roleList }, isActive: true },
        select: { id: true },
      });
      if (recipients.length === 0) return;
      await this.prisma.notification.createMany({
        data: recipients.map((u) => ({ facilityId, userId: u.id, type, message, link })),
      });
    } catch (err) {
      this.logger.error(
        `Failed to create role notification for ${Array.isArray(roles) ? roles.join(',') : roles}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  async findForUser(actor: AuthenticatedUser, limit = 20) {
    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId: actor.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      this.prisma.notification.count({ where: { userId: actor.id, readAt: null } }),
    ]);
    return { notifications, unreadCount };
  }

  async markRead(id: string, actor: AuthenticatedUser): Promise<void> {
    // updateMany (not update) so marking someone else's notification id is
    // a silent no-op rather than a 404/403 — the where clause already scopes
    // to the actor, which is simpler than a separate ownership check.
    await this.prisma.notification.updateMany({
      where: { id, userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(actor: AuthenticatedUser): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId: actor.id, readAt: null },
      data: { readAt: new Date() },
    });
  }
}

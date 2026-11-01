import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ACTOR: AuthenticatedUser = {
  id: 'user-1',
  email: 'doc@test.ng',
  role: Role.DOCTOR,
  facilityId: 'facility-1',
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: {
    notification: {
      create: jest.Mock;
      createMany: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      updateMany: jest.Mock;
    };
    user: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      notification: {
        create: jest.fn().mockResolvedValue({}),
        createMany: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        updateMany: jest.fn().mockResolvedValue({}),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [NotificationsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(NotificationsService);
  });

  describe('notifyUser', () => {
    it('creates a single notification row', async () => {
      await service.notifyUser('facility-1', 'user-2', 'LAB_RESULT_READY', 'Result ready', '/x');

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: { facilityId: 'facility-1', userId: 'user-2', type: 'LAB_RESULT_READY', message: 'Result ready', link: '/x' },
      });
    });

    it('swallows a write failure instead of throwing', async () => {
      prisma.notification.create.mockRejectedValue(new Error('db down'));

      await expect(
        service.notifyUser('facility-1', 'user-2', 'LAB_RESULT_READY', 'Result ready'),
      ).resolves.toBeUndefined();
    });
  });

  describe('notifyRole', () => {
    it('notifies every active user at the facility with a matching role', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'tech-1' }, { id: 'tech-2' }]);

      await service.notifyRole('facility-1', Role.LAB_TECH, 'LAB_ORDER_NEW', 'New order', '/labs');

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { facilityId: 'facility-1', role: { in: [Role.LAB_TECH] }, isActive: true },
        select: { id: true },
      });
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          { facilityId: 'facility-1', userId: 'tech-1', type: 'LAB_ORDER_NEW', message: 'New order', link: '/labs' },
          { facilityId: 'facility-1', userId: 'tech-2', type: 'LAB_ORDER_NEW', message: 'New order', link: '/labs' },
        ],
      });
    });

    it('accepts multiple roles', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'admin-1' }]);

      await service.notifyRole(
        'facility-1',
        [Role.RECORDS_OFFICER, Role.ADMIN],
        'NOTIFIABLE_DISEASE_FLAGGED',
        'Flagged',
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ role: { in: [Role.RECORDS_OFFICER, Role.ADMIN] } }) }),
      );
    });

    it('does nothing when no one at the facility holds the role', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.notifyRole('facility-1', Role.PHARMACIST, 'PRESCRIPTION_NEW', 'x');

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });

    it('swallows a write failure instead of throwing', async () => {
      prisma.user.findMany.mockRejectedValue(new Error('db down'));

      await expect(
        service.notifyRole('facility-1', Role.PHARMACIST, 'PRESCRIPTION_NEW', 'x'),
      ).resolves.toBeUndefined();
    });
  });

  describe('findForUser', () => {
    it('returns the user\'s notifications and unread count', async () => {
      prisma.notification.findMany.mockResolvedValue([{ id: 'n-1' }]);
      prisma.notification.count.mockResolvedValue(3);

      const result = await service.findForUser(ACTOR);

      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
      });
      expect(result).toEqual({ notifications: [{ id: 'n-1' }], unreadCount: 3 });
    });
  });

  describe('markRead', () => {
    it('only updates a notification owned by the actor', async () => {
      await service.markRead('n-1', ACTOR);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n-1', userId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });

  describe('markAllRead', () => {
    it('marks every unread notification for the actor', async () => {
      await service.markAllRead(ACTOR);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', readAt: null },
        data: { readAt: expect.any(Date) },
      });
    });
  });
});

import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/auth.types';

const ADMIN_ACTOR: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@clinic.ng',
  role: Role.ADMIN,
  facilityId: 'facility-1',
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() } };

    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(UsersService);
  });

  it('lets an admin create a doctor in their own facility', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'doctor-1',
      email: 'doc@clinic.ng',
      fullName: 'Dr X',
      role: Role.DOCTOR,
      licenseNumber: 'MDCN/1',
      licenseBody: 'MDCN',
      isActive: true,
      createdAt: new Date(),
    });

    await service.create(
      { email: 'doc@clinic.ng', password: 'Password123!', fullName: 'Dr X', role: Role.DOCTOR, licenseNumber: 'MDCN/1', licenseBody: 'MDCN' },
      ADMIN_ACTOR,
    );

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ facilityId: 'facility-1', role: Role.DOCTOR }) }),
    );
  });

  it('rejects creating a duplicate-email account', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        { email: 'dup@clinic.ng', password: 'Password123!', fullName: 'X', role: Role.NURSE },
        ADMIN_ACTOR,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  // A regular admin self-registering their facility should never be able to
  // mint a platform-level SUPER_ADMIN account for themselves or anyone else.
  it('blocks a non-super-admin from creating a SUPER_ADMIN account', async () => {
    await expect(
      service.create(
        { email: 'x@clinic.ng', password: 'Password123!', fullName: 'X', role: Role.SUPER_ADMIN },
        ADMIN_ACTOR,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('allows a super admin to create another super admin', async () => {
    const superAdminActor: AuthenticatedUser = { ...ADMIN_ACTOR, role: Role.SUPER_ADMIN };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'sa-2',
      email: 'sa2@clinic.ng',
      fullName: 'SA Two',
      role: Role.SUPER_ADMIN,
      licenseNumber: null,
      licenseBody: null,
      isActive: true,
      createdAt: new Date(),
    });

    await expect(
      service.create(
        { email: 'sa2@clinic.ng', password: 'Password123!', fullName: 'SA Two', role: Role.SUPER_ADMIN },
        superAdminActor,
      ),
    ).resolves.toMatchObject({ role: Role.SUPER_ADMIN });
  });

  it('only lists staff within the actor\'s own facility', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.findAllForFacility(ADMIN_ACTOR);

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { facilityId: 'facility-1' } }),
    );
  });
});

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { PayersService } from '../billing/payers.service';

type Tx = {
  facility: { create: jest.Mock };
  user: { create: jest.Mock };
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };
  let jwt: { sign: jest.Mock };
  let payersService: { ensureSelfPayPayer: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    jwt = { sign: jest.fn(() => 'signed.jwt.token') };
    payersService = { ensureSelfPayPayer: jest.fn().mockResolvedValue({ id: 'payer-self-pay' }) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: PayersService, useValue: payersService },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('login', () => {
    it('rejects an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('nobody@test.ng', 'whatever')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a deactivated account even with the right password', async () => {
      const passwordHash = await AuthService.hashPassword('CorrectPass123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'x@test.ng',
        passwordHash,
        isActive: false,
        role: Role.DOCTOR,
        facilityId: 'f1',
      });

      await expect(service.login('x@test.ng', 'CorrectPass123!')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects the wrong password', async () => {
      const passwordHash = await AuthService.hashPassword('CorrectPass123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'x@test.ng',
        passwordHash,
        isActive: true,
        role: Role.DOCTOR,
        facilityId: 'f1',
      });

      await expect(service.login('x@test.ng', 'WrongPassword!')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues a token and records lastLoginAt on success', async () => {
      const passwordHash = await AuthService.hashPassword('CorrectPass123!');
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'x@test.ng',
        fullName: 'Dr X',
        passwordHash,
        isActive: true,
        role: Role.DOCTOR,
        facilityId: 'f1',
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.login('x@test.ng', 'CorrectPass123!');

      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toMatchObject({ id: 'user-1', email: 'x@test.ng', role: Role.DOCTOR });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'user-1' } }),
      );
    });
  });

  describe('register', () => {
    it('rejects a duplicate email without creating anything', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          facilityName: 'Clinic',
          state: 'Lagos',
          lga: 'Ikeja',
          adminFullName: 'Admin',
          email: 'dup@test.ng',
          password: 'Password123!',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    // This is the behaviour that makes self-service sign-up safe: it only
    // ever creates an ADMIN for a brand-new facility, never a clinical
    // role — see the comment on AuthService.register for why.
    it('creates a facility and its first ADMIN user, and returns a session', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const tx: Tx = {
        facility: { create: jest.fn().mockResolvedValue({ id: 'facility-1' }) },
        user: {
          create: jest.fn().mockResolvedValue({
            id: 'user-1',
            email: 'admin@clinic.ng',
            fullName: 'New Admin',
            role: Role.ADMIN,
            facilityId: 'facility-1',
          }),
        },
      };
      prisma.$transaction.mockImplementation((cb: (t: Tx) => unknown) => cb(tx));

      const result = await service.register({
        facilityName: 'Ikeja Clinic',
        state: 'Lagos',
        lga: 'Ikeja',
        adminFullName: 'New Admin',
        email: 'admin@clinic.ng',
        password: 'Password123!',
      });

      expect(tx.facility.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Ikeja Clinic', state: 'Lagos', lga: 'Ikeja' }),
        }),
      );
      expect(tx.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            facilityId: 'facility-1',
            role: Role.ADMIN,
            email: 'admin@clinic.ng',
          }),
        }),
      );
      expect(result.accessToken).toBe('signed.jwt.token');
      expect(result.user).toMatchObject({ id: 'user-1', role: Role.ADMIN, facilityId: 'facility-1' });
      expect(payersService.ensureSelfPayPayer).toHaveBeenCalledWith('facility-1');
    });
  });
});

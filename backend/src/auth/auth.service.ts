import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PayersService } from '../billing/payers.service';
import { JwtPayload } from './auth.types';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly payersService: PayersService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await argon2.verify(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        facilityId: user.facilityId,
      },
    };
  }

  /**
   * Self-service sign-up: creates a brand-new facility along with its first
   * ADMIN account. There is deliberately no open sign-up for clinical roles
   * (DOCTOR/NURSE/etc.) — those are created by that facility's admin via
   * POST /users once they're signed in (see UsersService), so clinical
   * record access always traces back to an admin who vouched for the
   * account rather than anonymous self-registration.
   */
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await AuthService.hashPassword(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const facility = await tx.facility.create({
        data: {
          name: dto.facilityName,
          state: dto.state,
          lga: dto.lga,
          address: dto.address,
          phone: dto.facilityPhone,
        },
      });

      return tx.user.create({
        data: {
          facilityId: facility.id,
          email: dto.email,
          passwordHash,
          fullName: dto.adminFullName,
          role: Role.ADMIN,
        },
      });
    });

    await this.payersService.ensureSelfPayPayer(user.facilityId);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
    };

    return {
      accessToken: this.jwt.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        facilityId: user.facilityId,
      },
    };
  }

  static async hashPassword(plaintext: string): Promise<string> {
    return argon2.hash(plaintext);
  }
}

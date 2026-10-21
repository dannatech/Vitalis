import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a staff account within the acting admin's own facility. This is
   * the only way clinical-role accounts come into existence — see the note
   * on AuthService.register for why there's no open self-sign-up for them.
   */
  async create(dto: CreateUserDto, actor: AuthenticatedUser) {
    if (dto.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super admin can create a super admin account');
    }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await AuthService.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        facilityId: actor.facilityId,
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        role: dto.role,
        licenseNumber: dto.licenseNumber,
        licenseBody: dto.licenseBody,
      },
    });

    return this.toResponse(user);
  }

  async findAllForFacility(actor: AuthenticatedUser) {
    const users = await this.prisma.user.findMany({
      where: { facilityId: actor.facilityId },
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toResponse(user));
  }

  private toResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      licenseNumber: user.licenseNumber,
      licenseBody: user.licenseBody,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }
}

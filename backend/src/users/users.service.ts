import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

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

  /**
   * Changes an existing staff member's role within the acting admin's own
   * facility. Mirrors create()'s super-admin guard in both directions (can't
   * grant it, can't touch an existing super admin's role unless you are one),
   * and blocks self-edit so an admin can't accidentally lock themselves out.
   */
  async updateRole(targetId: string, dto: UpdateUserRoleDto, actor: AuthenticatedUser) {
    if (targetId === actor.id) {
      throw new BadRequestException('You cannot change your own role');
    }

    const target = await this.prisma.user.findFirst({
      where: { id: targetId, facilityId: actor.facilityId },
    });
    if (!target) {
      throw new NotFoundException('Staff account not found');
    }

    if (dto.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only a super admin can grant super admin access');
    }
    if (target.role === Role.SUPER_ADMIN && actor.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException("Only a super admin can change a super admin's role");
    }

    const updated = await this.prisma.user.update({
      where: { id: targetId },
      data: { role: dto.role },
    });
    return this.toResponse(updated);
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

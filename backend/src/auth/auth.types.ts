import { Role } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  facilityId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  facilityId: string;
}

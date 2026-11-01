import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

// No @Roles() restriction — every authenticated user, any role, reads and
// manages only their own notifications (scoped via @CurrentUser() inside
// the service, same as /auth/me). No @Audit() either: these are staff
// workflow UX, not patient-record access, and the list endpoint is polled
// every ~30s per signed-in user — auditing that would just flood the
// NDPR accountability log with noise it isn't meant to carry.
@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.findForUser(user);
  }

  @Post(':id/read')
  markRead(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markRead(id, user);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user);
  }
}

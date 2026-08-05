import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';
import { PushSyncDto } from './dto/push-sync.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('push')
  push(@Body() dto: PushSyncDto, @CurrentUser() user: AuthenticatedUser) {
    return this.syncService.push(dto, user);
  }

  @Get('pull')
  pull(@Query('since') since: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.syncService.pull(since, user);
  }
}

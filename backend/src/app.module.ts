import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { CryptoModule } from './common/crypto/crypto.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PatientsModule } from './patients/patients.module';
import { EncountersModule } from './encounters/encounters.module';
import { LabsModule } from './labs/labs.module';
import { NcdcReportsModule } from './ncdc-reports/ncdc-reports.module';
import { PharmacyModule } from './pharmacy/pharmacy.module';
import { ConsentModule } from './consent/consent.module';
import { BillingModule } from './billing/billing.module';
import { SyncModule } from './sync/sync.module';
import { HealthController } from './health/health.controller';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    CryptoModule,
    AuthModule,
    UsersModule,
    PatientsModule,
    EncountersModule,
    LabsModule,
    NcdcReportsModule,
    PharmacyModule,
    ConsentModule,
    BillingModule,
    SyncModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}

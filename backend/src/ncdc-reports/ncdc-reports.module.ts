import { Module } from '@nestjs/common';
import { NcdcReportsController } from './ncdc-reports.controller';
import { NcdcReportsService } from './ncdc-reports.service';

@Module({
  controllers: [NcdcReportsController],
  providers: [NcdcReportsService],
})
export class NcdcReportsModule {}

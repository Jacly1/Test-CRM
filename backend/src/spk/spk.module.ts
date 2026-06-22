import { Module } from '@nestjs/common';
import { SpkService } from './spk.service';
import { SpkController } from './spk.controller';
import { HistoryModule } from '../history/history.module';

@Module({
  imports: [HistoryModule],
  providers: [SpkService],
  controllers: [SpkController],
})
export class SpkModule {}

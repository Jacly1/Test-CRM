import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { EntityType } from '@prisma/client';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  find(@Query('entityType') entityType: EntityType, @Query('entityId') entityId: string) {
    return this.historyService.findFor(entityType, entityId);
  }
}

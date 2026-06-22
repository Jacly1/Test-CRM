import {
  Body, Controller, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { SpkService } from './spk.service';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { UpdateSpkDto } from './dto/update-spk.dto';
import { RejectSpkDto } from './dto/reject-spk.dto';
import { ApproveSpkDto } from './dto/approve-spk.dto';
import { QuerySpkDto } from './dto/query-spk.dto';
import { AssignSpkDto } from './dto/assign-spk.dto';
import { CancelSpkDto } from './dto/cancel-spk.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('spk')
export class SpkController {
  constructor(private readonly spkService: SpkService) {}

  @Get()
  @RequirePermissions('spk.read', 'spk.read.all')
  findAll(@Query() query: QuerySpkDto, @CurrentUser() user: AuthUser) {
    return this.spkService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('spk.read', 'spk.read.all')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.spkService.findOne(id, user);
  }

  @Post('convert')
  @RequirePermissions('spk.create')
  convert(@Body() dto: ConvertLeadDto, @CurrentUser() user: AuthUser) {
    return this.spkService.convertFromLead(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('spk.update')
  update(@Param('id') id: string, @Body() dto: UpdateSpkDto, @CurrentUser() user: AuthUser) {
    return this.spkService.update(id, dto, user);
  }

  @Post(':id/submit')
  @RequirePermissions('spk.submit')
  submit(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.spkService.submit(id, user);
  }

  @Post(':id/claim')
  @RequirePermissions('spk.claim')
  claim(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.spkService.claim(id, user);
  }

  @Patch(':id/assign')
  @RequirePermissions('spk.assign')
  assign(@Param('id') id: string, @Body() dto: AssignSpkDto, @CurrentUser() user: AuthUser) {
    return this.spkService.assign(id, dto.assignedFinanceId ?? null, user);
  }

  @Post(':id/cancel')
  @RequirePermissions('spk.cancel')
  cancel(@Param('id') id: string, @Body() dto: CancelSpkDto, @CurrentUser() user: AuthUser) {
    return this.spkService.cancel(id, dto.notes, user);
  }

  @Post(':id/approve')
  @RequirePermissions('spk.approve')
  approve(@Param('id') id: string, @Body() dto: ApproveSpkDto, @CurrentUser() user: AuthUser) {
    return this.spkService.approve(id, dto, user);
  }

  @Post(':id/reject')
  @RequirePermissions('spk.reject')
  reject(@Param('id') id: string, @Body() dto: RejectSpkDto, @CurrentUser() user: AuthUser) {
    return this.spkService.reject(id, dto, user);
  }
}

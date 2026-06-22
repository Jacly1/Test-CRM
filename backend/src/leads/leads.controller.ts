import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { ReassignLeadDto } from './dto/reassign-lead.dto';
import { ChangeLeadStatusDto } from './dto/change-lead-status.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CurrentUser, AuthUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermissions('lead.read', 'lead.read.all')
  findAll(@Query() query: QueryLeadDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermissions('lead.read', 'lead.read.all')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leadsService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('lead.create')
  create(@Body() dto: CreateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('lead.update')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.update(id, dto, user);
  }

  @Patch(':id/status')
  @RequirePermissions('lead.update')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeLeadStatusDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.changeStatus(id, dto, user);
  }

  @Patch(':id/reassign')
  @RequirePermissions('lead.reassign')
  reassign(@Param('id') id: string, @Body() dto: ReassignLeadDto, @CurrentUser() user: AuthUser) {
    return this.leadsService.reassign(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('lead.delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.leadsService.remove(id, user);
  }
}

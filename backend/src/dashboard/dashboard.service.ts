import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AuthUser,
  userHasPermission,
} from '../common/decorators/current-user.decorator';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async stats(user: AuthUser) {
    const canSeeAllLeads = userHasPermission(user, 'lead.read.all');
    const canSeeAllSpk = userHasPermission(user, 'spk.read.all');
    const canVerify =
      userHasPermission(user, 'spk.approve') || userHasPermission(user, 'spk.reject');

    const leadWhere: Prisma.LeadWhereInput = canSeeAllLeads
      ? {}
      : { ownerId: user.id };

    const isAdmin = userHasPermission(user, 'spk.assign');
    let spkWhere: Prisma.SpkWhereInput = {};
    if (isAdmin) {
      spkWhere = {}; // semua SPK termasuk draft
    } else if (canSeeAllSpk) {
      spkWhere = { salesStatus: 'SUBMITTED' }; // Finance: tanpa draft
    } else {
      const or: Prisma.SpkWhereInput[] = [{ lead: { ownerId: user.id } }];
      if (canVerify) or.push({ salesStatus: 'SUBMITTED' });
      spkWhere = { OR: or };
    }

    const [
      leadTotal,
      leadsByStatusRaw,
      spkTotal,
      spkByFinanceRaw,
      spkPendingCount,
    ] = await Promise.all([
      this.prisma.lead.count({ where: leadWhere }),
      this.prisma.lead.groupBy({ by: ['status'], where: leadWhere, _count: { _all: true } }),
      this.prisma.spk.count({ where: spkWhere }),
      this.prisma.spk.groupBy({ by: ['financeStatus'], where: spkWhere, _count: { _all: true } }),
      this.prisma.spk.count({
        where: { ...spkWhere, salesStatus: 'SUBMITTED', financeStatus: 'PENDING' },
      }),
    ]);

    const leadsByStatus: Record<string, number> = {};
    for (const row of leadsByStatusRaw) leadsByStatus[row.status] = row._count._all;

    const spkByFinance: Record<string, number> = {};
    for (const row of spkByFinanceRaw) spkByFinance[row.financeStatus] = row._count._all;

    const result: any = {
      scope: canSeeAllLeads || canSeeAllSpk ? 'all' : 'own',
      leads: { total: leadTotal, byStatus: leadsByStatus },
      spk: {
        total: spkTotal,
        byFinanceStatus: spkByFinance,
        awaitingVerification: spkPendingCount,
      },
    };

    if (userHasPermission(user, 'user.read')) {
      result.users = { total: await this.prisma.user.count() };
    }
    if (userHasPermission(user, 'role.read')) {
      result.roles = { total: await this.prisma.role.count() };
    }

    return result;
  }
}

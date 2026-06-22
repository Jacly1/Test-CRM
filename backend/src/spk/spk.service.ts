import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import {
  EntityType, LeadStatus, Prisma, Spk, SpkFinanceStatus, SpkSalesStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { AuthUser, userHasPermission } from '../common/decorators/current-user.decorator';
import { ConvertLeadDto } from './dto/convert-lead.dto';
import { UpdateSpkDto } from './dto/update-spk.dto';
import { RejectSpkDto } from './dto/reject-spk.dto';
import { ApproveSpkDto } from './dto/approve-spk.dto';
import { QuerySpkDto } from './dto/query-spk.dto';

@Injectable()
export class SpkService {
  constructor(
    private prisma: PrismaService,
    private history: HistoryService,
  ) {}

  private canSeeAll(user: AuthUser) {
    return userHasPermission(user, 'spk.read.all');
  }
  private canVerify(user: AuthUser) {
    return userHasPermission(user, 'spk.approve') || userHasPermission(user, 'spk.reject');
  }
  private canManageAnyLead(user: AuthUser) {
    return userHasPermission(user, 'lead.read.all');
  }
  /** Admin / pengelola: boleh menimpa klaim Finance lain. */
  private canOverrideLock(user: AuthUser) {
    return userHasPermission(user, 'spk.assign');
  }

  private readonly spkInclude = {
    lead: { select: { id: true, companyName: true, ownerId: true } },
    assignedFinance: { select: { id: true, name: true } },
  };

  private async generateSpkNumber(tx: Prisma.TransactionClient): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const period = `${year}-${month}`;
    const counter = await tx.spkCounter.upsert({
      where: { period },
      create: { period, seq: 1 },
      update: { seq: { increment: 1 } },
    });
    const seq = String(counter.seq).padStart(4, '0');
    return `SPK/${year}/${month}/${seq}`;
  }

  async convertFromLead(dto: ConvertLeadDto, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: dto.leadId },
      include: { spk: true },
    });
    if (!lead) throw new NotFoundException('Lead tidak ditemukan.');
    if (!this.canManageAnyLead(user) && lead.ownerId !== user.id) {
      throw new ForbiddenException('Anda tidak berhak mengonversi Lead ini.');
    }
    if (lead.status !== LeadStatus.WON) {
      throw new BadRequestException('Hanya Lead berstatus WON yang dapat dikonversi menjadi SPK.');
    }
    if (lead.spk) {
      throw new BadRequestException('Lead ini sudah memiliki SPK.');
    }
    if (new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    }

    return this.prisma.$transaction(async (tx) => {
      const spkNumber = await this.generateSpkNumber(tx);
      const spk = await tx.spk.create({
        data: {
          spkNumber,
          leadId: lead.id,
          projectName: dto.projectName,
          contractValue: dto.contractValue,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          salesStatus: SpkSalesStatus.DRAFT,
          financeStatus: SpkFinanceStatus.PENDING,
        },
      });
      await this.history.record(
        {
          entityType: EntityType.SPK, entityId: spk.id, fromStatus: null,
          toStatus: 'DRAFT', changedById: user.id,
          notes: `SPK dibuat dari Lead ${lead.companyName}.`,
        },
        tx,
      );
      return spk;
    });
  }

  async findAll(query: QuerySpkDto, user: AuthUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.SpkWhereInput = {};
    if (this.canOverrideLock(user)) {
      // Admin: melihat semua SPK termasuk draft.
    } else if (this.canSeeAll(user)) {
      // Finance: hanya SPK yang sudah dikirim (draft Sales disembunyikan).
      where.salesStatus = SpkSalesStatus.SUBMITTED;
    } else {
      // Sales: hanya SPK miliknya (semua status, termasuk draft).
      where.OR = [{ lead: { ownerId: user.id } }];
    }
    if (query.search) {
      const searchOr: Prisma.SpkWhereInput[] = [
        { spkNumber: { contains: query.search, mode: 'insensitive' } },
        { projectName: { contains: query.search, mode: 'insensitive' } },
      ];
      where.AND = [...(where.OR ? [{ OR: where.OR }] : []), { OR: searchOr }];
      delete where.OR;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.spk.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: this.spkInclude,
      }),
      this.prisma.spk.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private ensureCanView(spk: Spk & { lead: { ownerId: string } }, user: AuthUser) {
    if (this.canOverrideLock(user)) return; // Admin: semua SPK
    if (this.canSeeAll(user)) {
      // Finance: hanya SPK yang sudah dikirim.
      if (spk.salesStatus === SpkSalesStatus.SUBMITTED) return;
      throw new ForbiddenException('SPK belum dikirim ke Finance.');
    }
    if (spk.lead.ownerId === user.id) return; // Sales pemilik
    throw new ForbiddenException('Anda tidak berhak mengakses SPK ini.');
  }

  async findOne(id: string, user: AuthUser) {
    const spk = await this.prisma.spk.findUnique({
      where: { id },
      include: { lead: true, assignedFinance: { select: { id: true, name: true } } },
    });
    if (!spk) throw new NotFoundException('SPK tidak ditemukan.');
    this.ensureCanView(spk as any, user);
    return spk;
  }

  private async getOwnedSpkForSales(id: string, user: AuthUser) {
    const spk = await this.prisma.spk.findUnique({ where: { id }, include: { lead: true } });
    if (!spk) throw new NotFoundException('SPK tidak ditemukan.');
    if (!this.canManageAnyLead(user) && spk.lead.ownerId !== user.id) {
      throw new ForbiddenException('Anda tidak berhak mengubah SPK ini.');
    }
    return spk;
  }

  async update(id: string, dto: UpdateSpkDto, user: AuthUser) {
    const spk = await this.getOwnedSpkForSales(id, user);
    if (spk.financeStatus === SpkFinanceStatus.CANCELLED) {
      throw new ForbiddenException('SPK sudah dibatalkan dan tidak dapat diubah.');
    }
    if (spk.financeStatus === SpkFinanceStatus.APPROVED) {
      throw new ForbiddenException('SPK yang sudah disetujui tidak dapat diubah.');
    }
    if (dto.startDate && dto.endDate && new Date(dto.endDate) < new Date(dto.startDate)) {
      throw new BadRequestException('Tanggal selesai tidak boleh sebelum tanggal mulai.');
    }
    return this.prisma.spk.update({
      where: { id },
      data: {
        projectName: dto.projectName,
        contractValue: dto.contractValue,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async submit(id: string, user: AuthUser) {
    const spk = await this.getOwnedSpkForSales(id, user);
    if (spk.financeStatus === SpkFinanceStatus.CANCELLED) {
      throw new ForbiddenException('SPK sudah dibatalkan dan tidak dapat dikirim.');
    }
    if (spk.financeStatus === SpkFinanceStatus.APPROVED) {
      throw new ForbiddenException('SPK sudah disetujui dan tidak dapat dikirim ulang.');
    }
    if (spk.salesStatus === SpkSalesStatus.SUBMITTED && spk.financeStatus === SpkFinanceStatus.PENDING) {
      throw new BadRequestException('SPK sudah dikirim dan sedang menunggu verifikasi.');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.spk.update({
        where: { id },
        data: { salesStatus: SpkSalesStatus.SUBMITTED, financeStatus: SpkFinanceStatus.PENDING },
      });
      await this.history.record(
        {
          entityType: EntityType.SPK, entityId: id, fromStatus: spk.salesStatus,
          toStatus: 'SUBMITTED', changedById: user.id, notes: 'SPK dikirim (ulang) ke Finance.',
        },
        tx,
      );
      return updated;
    });
  }

  private async getSubmittedSpkForFinance(id: string) {
    const spk = await this.prisma.spk.findUnique({ where: { id } });
    if (!spk) throw new NotFoundException('SPK tidak ditemukan.');
    if (spk.salesStatus !== SpkSalesStatus.SUBMITTED) {
      throw new BadRequestException('SPK belum dikirim oleh Sales.');
    }
    if (spk.financeStatus !== SpkFinanceStatus.PENDING) {
      throw new BadRequestException('SPK sudah diverifikasi sebelumnya.');
    }
    return spk;
  }

  /** Pastikan SPK tidak sedang diklaim Finance lain (kecuali Admin yang boleh menimpa). */
  private ensureNotLockedByOther(spk: { assignedFinanceId: string | null }, user: AuthUser) {
    if (spk.assignedFinanceId && spk.assignedFinanceId !== user.id && !this.canOverrideLock(user)) {
      throw new ConflictException(
        'SPK ini sedang ditangani oleh Finance lain. Minta Admin untuk menugaskan ulang bila perlu.',
      );
    }
  }

  /** Finance "mengunci" SPK dari antrian bersama agar tidak bentrok dengan rekan. */
  async claim(id: string, user: AuthUser) {
    const spk = await this.getSubmittedSpkForFinance(id);
    this.ensureNotLockedByOther(spk, user);
    if (spk.assignedFinanceId === user.id) {
      throw new BadRequestException('SPK ini sudah Anda klaim.');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.spk.update({
        where: { id },
        data: { assignedFinanceId: user.id },
        include: this.spkInclude,
      });
      await this.history.record(
        {
          entityType: EntityType.SPK, entityId: id, fromStatus: spk.financeStatus,
          toStatus: spk.financeStatus, changedById: user.id, notes: `SPK diklaim oleh ${user.name}.`,
        },
        tx,
      );
      return updated;
    });
  }

  /** Admin menugaskan/mengalihkan SPK ke Finance tertentu (assignedFinanceId null = lepas). */
  async assign(id: string, assignedFinanceId: string | null, user: AuthUser) {
    const spk = await this.prisma.spk.findUnique({ where: { id } });
    if (!spk) throw new NotFoundException('SPK tidak ditemukan.');
    let targetName = 'antrian bersama';
    if (assignedFinanceId) {
      const target = await this.prisma.user.findUnique({
        where: { id: assignedFinanceId },
        select: { id: true, name: true, role: { select: { permissions: { select: { permission: { select: { key: true } } } } } } },
      });
      if (!target) throw new BadRequestException('User tujuan tidak ditemukan.');
      const keys = target.role?.permissions.map((p) => p.permission.key) ?? [];
      if (!keys.includes('spk.approve') && !keys.includes('spk.reject')) {
        throw new BadRequestException('User tujuan bukan Finance (tidak dapat memverifikasi SPK).');
      }
      targetName = target.name;
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.spk.update({
        where: { id },
        data: { assignedFinanceId },
        include: this.spkInclude,
      });
      await this.history.record(
        {
          entityType: EntityType.SPK, entityId: id, fromStatus: spk.financeStatus,
          toStatus: spk.financeStatus, changedById: user.id,
          notes: `SPK ditugaskan ke ${targetName} oleh ${user.name}.`,
        },
        tx,
      );
      return updated;
    });
  }

  async approve(id: string, dto: ApproveSpkDto, user: AuthUser) {
    const spk = await this.getSubmittedSpkForFinance(id);
    this.ensureNotLockedByOther(spk, user);
    const note = dto.notes?.trim();
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.spk.update({
        where: { id },
        data: {
          financeStatus: SpkFinanceStatus.APPROVED,
          financeNotes: note || null,
          assignedFinanceId: spk.assignedFinanceId ?? user.id,
        },
      });
      await this.history.record(
        {
          entityType: EntityType.SPK, entityId: id, fromStatus: spk.financeStatus,
          toStatus: 'APPROVED', changedById: user.id,
          notes: note ? `Disetujui: ${note}` : 'SPK disetujui Finance.',
        },
        tx,
      );
      return updated;
    });
  }

  async reject(id: string, dto: RejectSpkDto, user: AuthUser) {
    const spk = await this.getSubmittedSpkForFinance(id);
    this.ensureNotLockedByOther(spk, user);
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.spk.update({
        where: { id },
        data: {
          financeStatus: SpkFinanceStatus.REJECTED,
          financeNotes: dto.notes,
          assignedFinanceId: spk.assignedFinanceId ?? user.id,
        },
      });
      await this.history.record(
        {
          entityType: EntityType.SPK, entityId: id, fromStatus: spk.financeStatus,
          toStatus: 'REJECTED', changedById: user.id, notes: `Ditolak: ${dto.notes}`,
        },
        tx,
      );
      return updated;
    });
  }

  /** Batalkan SPK (Finance/Admin). Membatalkan lead terkait sekaligus. */
  async cancel(id: string, notes: string, user: AuthUser) {
    const spk = await this.prisma.spk.findUnique({ where: { id }, include: { lead: true } });
    if (!spk) throw new NotFoundException('SPK tidak ditemukan.');
    if (spk.financeStatus === SpkFinanceStatus.CANCELLED) {
      throw new BadRequestException('SPK sudah dibatalkan.');
    }
    this.ensureNotLockedByOther(spk, user);
    const reason = notes?.trim();
    if (!reason) throw new BadRequestException('Alasan pembatalan wajib diisi.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.spk.update({
        where: { id },
        data: { financeStatus: SpkFinanceStatus.CANCELLED, financeNotes: reason },
      });
      await this.history.record(
        {
          entityType: EntityType.SPK, entityId: id, fromStatus: spk.financeStatus,
          toStatus: 'CANCELLED', changedById: user.id, notes: `Dibatalkan: ${reason}`,
        },
        tx,
      );
      // Cascade: lead ikut dibatalkan
      if (spk.lead.status !== LeadStatus.CANCELLED) {
        await tx.lead.update({ where: { id: spk.leadId }, data: { status: LeadStatus.CANCELLED } });
        await this.history.record(
          {
            entityType: EntityType.LEAD, entityId: spk.leadId, fromStatus: spk.lead.status,
            toStatus: 'CANCELLED', changedById: user.id, notes: 'Lead dibatalkan mengikuti pembatalan SPK.',
          },
          tx,
        );
      }
      return updated;
    });
  }
}

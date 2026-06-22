import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EntityType, Lead, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HistoryService } from '../history/history.service';
import { AuthUser, userHasPermission } from '../common/decorators/current-user.decorator';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { QueryLeadDto } from './dto/query-lead.dto';
import { ReassignLeadDto } from './dto/reassign-lead.dto';
import { ChangeLeadStatusDto } from './dto/change-lead-status.dto';

@Injectable()
export class LeadsService {
  constructor(
    private prisma: PrismaService,
    private history: HistoryService,
  ) {}

  private canSeeAll(user: AuthUser) {
    return userHasPermission(user, 'lead.read.all');
  }

  private ensureCanAccess(lead: Lead, user: AuthUser) {
    if (this.canSeeAll(user)) return;
    if (lead.ownerId === user.id) return;
    throw new ForbiddenException('Anda tidak berhak mengakses Lead ini.');
  }

  async findAll(query: QueryLeadDto, user: AuthUser) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {};
    if (!this.canSeeAll(user)) where.ownerId = user.id;
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { companyName: { contains: query.search, mode: 'insensitive' } },
        { contactName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.lead.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true } },
          spk: { select: { id: true, spkNumber: true } },
        },
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } }, spk: true },
    });
    if (!lead) throw new NotFoundException('Lead tidak ditemukan.');
    this.ensureCanAccess(lead, user);
    return lead;
  }

  async create(dto: CreateLeadDto, user: AuthUser) {
    const ownerId = user.id;
    return this.prisma.$transaction(async (tx) => {
      const lead = await tx.lead.create({
        data: {
          companyName: dto.companyName,
          contactName: dto.contactName,
          phone: dto.phone,
          email: dto.email,
          source: dto.source,
          estimatedValue: dto.estimatedValue,
          status: dto.status ?? 'NEW',
          notes: dto.notes,
          ownerId,
        },
      });
      await this.history.record(
        {
          entityType: EntityType.LEAD, entityId: lead.id, fromStatus: null,
          toStatus: lead.status, changedById: user.id,
          notes: dto.notes?.trim() ? dto.notes.trim() : 'Lead dibuat.',
        },
        tx,
      );
      return lead;
    });
  }

  async update(id: string, dto: UpdateLeadDto, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { spk: true } });
    if (!lead) throw new NotFoundException('Lead tidak ditemukan.');
    this.ensureCanAccess(lead, user);

    if (lead.status === 'CANCELLED') {
      throw new ForbiddenException('Lead sudah dibatalkan dan tidak dapat diubah.');
    }

    // Lead yang sudah punya SPK terkunci: satu-satunya perubahan yang diizinkan
    // adalah membatalkan lead (WON → CANCELLED), yang sekaligus membatalkan SPK-nya.
    if (lead.spk) {
      const isManager = this.canSeeAll(user); // Admin / pengelola semua lead
      if (lead.spk.financeStatus === 'APPROVED' && !isManager) {
        throw new ForbiddenException(
          'Lead sudah memiliki SPK yang disetujui dan tidak dapat diubah oleh Sales. ' +
            'Pembatalan dilakukan oleh Finance/Admin melalui SPK.',
        );
      }
      if (dto.status !== 'CANCELLED') {
        throw new BadRequestException(
          'Lead sudah memiliki SPK. Status hanya dapat diubah menjadi CANCELLED.',
        );
      }
      if (!userHasPermission(user, 'spk.cancel')) {
        throw new ForbiddenException(
          'Sales tidak dapat membatalkan lead yang sudah memiliki SPK. ' +
            'Pembatalan dilakukan oleh Finance/Admin melalui SPK.',
        );
      }
      return this.cancelLeadWithSpk(id, lead.spk.id, lead.status, lead.spk.financeStatus, user);
    }

    const statusChanged = !!dto.status && dto.status !== lead.status;
    const notesChanged = dto.notes !== undefined && dto.notes !== lead.notes;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({
        where: { id },
        data: {
          companyName: dto.companyName,
          contactName: dto.contactName,
          phone: dto.phone,
          email: dto.email,
          source: dto.source,
          estimatedValue: dto.estimatedValue,
          status: dto.status,
          notes: dto.notes,
        },
      });
      // Catat ke Riwayat bila status atau catatan berubah (catatan = satu data dengan panel).
      if (statusChanged || notesChanged) {
        const note = updated.notes?.trim()
          ? updated.notes
          : statusChanged
            ? 'Status Lead diperbarui.'
            : 'Catatan diperbarui.';
        await this.history.record(
          {
            entityType: EntityType.LEAD, entityId: id, fromStatus: lead.status,
            toStatus: updated.status, changedById: user.id, notes: note,
          },
          tx,
        );
      }
      return updated;
    });
  }

  /** Batalkan lead beserta SPK terkaitnya dalam satu transaksi (audit trail ganda). */
  private cancelLeadWithSpk(
    leadId: string,
    spkId: string,
    fromLeadStatus: string,
    fromSpkStatus: string,
    user: AuthUser,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id: leadId }, data: { status: 'CANCELLED' } });
      await this.history.record(
        {
          entityType: EntityType.LEAD, entityId: leadId, fromStatus: fromLeadStatus,
          toStatus: 'CANCELLED', changedById: user.id, notes: 'Lead dibatalkan.',
        },
        tx,
      );
      if (fromSpkStatus !== 'CANCELLED') {
        await tx.spk.update({ where: { id: spkId }, data: { financeStatus: 'CANCELLED' } });
        await this.history.record(
          {
            entityType: EntityType.SPK, entityId: spkId, fromStatus: fromSpkStatus,
            toStatus: 'CANCELLED', changedById: user.id, notes: 'SPK dibatalkan mengikuti pembatalan Lead.',
          },
          tx,
        );
      }
      return updated;
    });
  }

  /** Ubah status lead (selain pembatalan) dengan catatan wajib yang tercatat di riwayat. */
  async changeStatus(id: string, dto: ChangeLeadStatusDto, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { spk: true } });
    if (!lead) throw new NotFoundException('Lead tidak ditemukan.');
    this.ensureCanAccess(lead, user);

    if (lead.status === 'CANCELLED') {
      throw new ForbiddenException('Lead sudah dibatalkan dan tidak dapat diubah.');
    }
    if (lead.spk) {
      throw new ForbiddenException(
        'Lead sudah memiliki SPK. Status tidak dapat diubah di sini; pembatalan dilakukan melalui SPK.',
      );
    }
    if (dto.status === 'CANCELLED') {
      throw new BadRequestException('Status CANCELLED hanya melalui pembatalan SPK.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Catatan lead diperbarui ke catatan terbaru (satu data dengan panel & form edit),
      // dan tetap dicatat di Riwayat sebagai log.
      const updated = await tx.lead.update({
        where: { id },
        data: { status: dto.status, notes: dto.note },
      });
      await this.history.record(
        {
          entityType: EntityType.LEAD, entityId: id, fromStatus: lead.status,
          toStatus: dto.status, changedById: user.id, notes: dto.note,
        },
        tx,
      );
      return updated;
    });
  }

  async reassign(id: string, dto: ReassignLeadDto, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } },
    });
    if (!lead) throw new NotFoundException('Lead tidak ditemukan.');
    if (lead.ownerId === dto.ownerId) {
      throw new BadRequestException('Lead sudah dimiliki oleh user tersebut.');
    }
    const newOwner = await this.prisma.user.findUnique({
      where: { id: dto.ownerId },
      select: { id: true, name: true },
    });
    if (!newOwner) throw new BadRequestException('User tujuan tidak ditemukan.');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.lead.update({ where: { id }, data: { ownerId: newOwner.id } });
      await this.history.record(
        {
          entityType: EntityType.LEAD, entityId: id, fromStatus: lead.status, toStatus: lead.status,
          changedById: user.id,
          notes: `Lead dialihkan dari ${lead.owner?.name ?? '-'} ke ${newOwner.name}.`,
        },
        tx,
      );
      return updated;
    });
  }

  async remove(id: string, user: AuthUser) {
    const lead = await this.prisma.lead.findUnique({ where: { id }, include: { spk: true } });
    if (!lead) throw new NotFoundException('Lead tidak ditemukan.');
    this.ensureCanAccess(lead, user);
    if (lead.spk) {
      throw new ForbiddenException('Lead sudah memiliki SPK dan tidak dapat dihapus.');
    }
    await this.prisma.lead.delete({ where: { id } });
    return { success: true };
  }
}

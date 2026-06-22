import { Injectable } from '@nestjs/common';
import { EntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface RecordInput {
  entityType: EntityType;
  entityId: string;
  fromStatus?: string | null;
  toStatus: string;
  changedById: string;
  notes?: string | null;
}

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async record(input: RecordInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.statusHistory.create({
      data: {
        entityType: input.entityType,
        entityId: input.entityId,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus,
        changedById: input.changedById,
        notes: input.notes ?? null,
      },
    });
  }

  async findFor(entityType: EntityType, entityId: string) {
    return this.prisma.statusHistory.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        changedBy: { select: { id: true, name: true, role: { select: { name: true } } } },
      },
    });
  }
}

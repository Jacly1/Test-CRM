import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSIONS } from '../common/permissions';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  /** Full catalog of assignable permissions, grouped by feature. */
  catalog() {
    return PERMISSIONS;
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r) => this.serialize(r));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan.');
    return this.serialize(role);
  }

  private serialize(role: any) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      isDefault: role.isDefault,
      userCount: role._count?.users ?? 0,
      permissionKeys: role.permissions.map((p: any) => p.permission.key),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private async resolvePermissionIds(keys: string[]): Promise<string[]> {
    const unique = Array.from(new Set(keys));
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: unique } },
    });
    if (perms.length !== unique.length) {
      const found = new Set(perms.map((p) => p.key));
      const missing = unique.filter((k) => !found.has(k));
      throw new BadRequestException(`Hak akses tidak dikenal: ${missing.join(', ')}`);
    }
    return perms.map((p) => p.id);
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Nama role sudah digunakan.');

    const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: {
          create: permissionIds.map((permissionId) => ({ permissionId })),
        },
      },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    return this.serialize(role);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role tidak ditemukan.');
    if (role.isSystem) {
      throw new ForbiddenException('Role sistem tidak dapat diubah.');
    }

    if (dto.name && dto.name !== role.name) {
      const dup = await this.prisma.role.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (dup) throw new ConflictException('Nama role sudah digunakan.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.role.update({
        where: { id },
        data: { name: dto.name, description: dto.description },
      });

      if (dto.permissionKeys) {
        const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          skipDuplicates: true,
        });
      }

      const updated = await tx.role.findUnique({
        where: { id },
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
      });
      return this.serialize(updated);
    });
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role tidak ditemukan.');
    if (role.isSystem) {
      throw new ForbiddenException('Role sistem tidak dapat dihapus.');
    }
    if (role._count.users > 0) {
      throw new ConflictException('Role masih dipakai user, tidak dapat dihapus.');
    }
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}

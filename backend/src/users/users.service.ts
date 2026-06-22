import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const safeSelect = {
  id: true,
  name: true,
  email: true,
  provider: true,
  isActive: true,
  roleId: true,
  role: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({ select: safeSelect, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: safeSelect });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    return user;
  }

  /** Cek role ada; sekaligus tolak bila role itu Admin (isSystem). */
  private async assertAssignableRole(roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestException('Role tidak ditemukan.');
    if (role.isSystem) {
      throw new ForbiddenException('Role Admin tidak dapat diberikan ke user.');
    }
  }

  /** Ambil user beserta flag apakah role-nya Admin (terlindungi). */
  private async getUserWithProtection(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: { select: { isSystem: true } } },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email sudah digunakan.');
    await this.assertAssignableRole(dto.roleId);
    const password = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, password, provider: 'local', roleId: dto.roleId },
      select: safeSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const target = await this.getUserWithProtection(id);
    if (target.role?.isSystem) {
      throw new ForbiddenException('User dengan role Admin tidak dapat diubah.');
    }
    if (dto.roleId) await this.assertAssignableRole(dto.roleId);
    const data: any = { name: dto.name, email: dto.email, roleId: dto.roleId };
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);
    if (dto.email) {
      const exists = await this.prisma.user.findFirst({ where: { email: dto.email, NOT: { id } } });
      if (exists) throw new ConflictException('Email sudah digunakan.');
    }
    return this.prisma.user.update({ where: { id }, data, select: safeSelect });
  }

  async remove(id: string) {
    const target = await this.getUserWithProtection(id);
    if (target.role?.isSystem) {
      throw new ForbiddenException('User dengan role Admin tidak dapat dihapus.');
    }
    const leadCount = await this.prisma.lead.count({ where: { ownerId: id } });
    if (leadCount > 0) {
      throw new ConflictException('User masih memiliki Lead, tidak dapat dihapus.');
    }
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }
}

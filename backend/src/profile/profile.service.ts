import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { userWithRoleInclude, toSessionUser } from '../auth/auth.helpers';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: userWithRoleInclude,
    });
    if (!user) throw new NotFoundException('User tidak ditemukan.');
    return { ...toSessionUser(user), provider: user.provider };
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User tidak ditemukan.');

    const data: { name?: string; password?: string } = {};
    if (dto.name) data.name = dto.name;

    if (dto.newPassword) {
      // Local accounts must confirm their current password.
      if (user.password) {
        if (!dto.currentPassword) {
          throw new BadRequestException('Password saat ini wajib diisi.');
        }
        const ok = await bcrypt.compare(dto.currentPassword, user.password);
        if (!ok) throw new BadRequestException('Password saat ini salah.');
      }
      data.password = await bcrypt.hash(dto.newPassword, 10);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('Tidak ada perubahan.');
    }

    await this.prisma.user.update({ where: { id: userId }, data });
    return this.me(userId);
  }
}

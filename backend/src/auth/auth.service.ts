import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { userWithRoleInclude, toSessionUser, UserWithRole } from './auth.helpers';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private async sign(user: UserWithRole) {
    const token = await this.jwt.signAsync({ sub: user.id, email: user.email });
    return { accessToken: token, user: toSessionUser(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: userWithRoleInclude,
    });
    if (!user || !user.password || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Email atau password salah.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Akun Anda dinonaktifkan. Hubungi Admin.');
    }
    return this.sign(user);
  }

  async loginWithGoogle(profile: { email: string; name: string }) {
    let user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: userWithRoleInclude,
    });

    if (!user) {
      const defaultRole = await this.prisma.role.findFirst({ where: { isDefault: true } });
      user = await this.prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name || profile.email,
          provider: 'google',
          password: null,
          roleId: defaultRole?.id ?? null,
        },
        include: userWithRoleInclude,
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Akun Anda dinonaktifkan. Hubungi Admin.');
    }
    return this.sign(user);
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { userWithRoleInclude, toSessionUser } from './auth.helpers';

export interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'change-this-to-a-long-random-secret',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: userWithRoleInclude,
    });
    if (!user) {
      throw new UnauthorizedException('Token tidak valid.');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Akun Anda dinonaktifkan.');
    }
    return toSessionUser(user);
  }
}

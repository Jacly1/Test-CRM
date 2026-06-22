import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const perms: string[] = user?.permissions ?? [];

    // Pass if the user holds ANY of the required permission keys.
    const allowed = required.some((key) => perms.includes(key));
    if (!allowed) {
      throw new ForbiddenException('Anda tidak memiliki hak akses untuk aksi ini.');
    }
    return true;
  }
}

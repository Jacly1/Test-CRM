import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'required_permissions';

/**
 * Attach required permissions to a route. The user passes if they hold
 * ANY of the listed keys (e.g. `lead.read` OR `lead.read.all`).
 */
export const RequirePermissions = (...keys: string[]) =>
  SetMetadata(PERMISSIONS_KEY, keys);

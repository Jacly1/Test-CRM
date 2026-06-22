import { Prisma } from '@prisma/client';

/** Prisma include that loads a user's role and its permission keys. */
export const userWithRoleInclude = {
  role: { include: { permissions: { include: { permission: true } } } },
} satisfies Prisma.UserInclude;

export type UserWithRole = Prisma.UserGetPayload<{
  include: typeof userWithRoleInclude;
}>;

export function extractPermissions(user: UserWithRole): string[] {
  return user.role?.permissions.map((rp) => rp.permission.key) ?? [];
}

/** Shape returned to the client / embedded in the request after auth. */
export function toSessionUser(user: UserWithRole) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    roleId: user.roleId ?? null,
    roleName: user.role?.name ?? null,
    permissions: extractPermissions(user),
  };
}

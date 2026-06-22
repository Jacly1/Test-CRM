import { PrismaClient, LeadStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from '../src/common/permissions';

const prisma = new PrismaClient();

async function main() {
  // 1. Permissions catalog (idempotent)
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { feature: p.feature, action: p.action, description: p.description },
      create: p,
    });
  }
  const allPermissions = await prisma.permission.findMany();
  const permByKey = new Map(allPermissions.map((p) => [p.key, p.id]));

  // 2. Starter roles with their permission sets
  const roleMeta: Record<string, { description: string; isSystem?: boolean; isDefault?: boolean }> = {
    Admin: { description: 'Akses penuh ke seluruh sistem.', isSystem: true },
    Sales: { description: 'Mengelola lead miliknya dan mengajukan SPK.' },
    Finance: { description: 'Memverifikasi (menyetujui/menolak) SPK dan melihat data.' },
    Viewer: { description: 'Akses dasar; diberikan otomatis untuk login Google baru.', isDefault: true },
  };

  const roleByName = new Map<string, string>();
  for (const [name, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const meta = roleMeta[name] ?? { description: '' };
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: meta.description, isSystem: !!meta.isSystem, isDefault: !!meta.isDefault },
      create: { name, description: meta.description, isSystem: !!meta.isSystem, isDefault: !!meta.isDefault },
    });
    roleByName.set(name, role.id);

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: keys
        .map((k) => permByKey.get(k))
        .filter((id): id is string => !!id)
        .map((permissionId) => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }

  // 3. Demo users
  const password = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@solusiklik.id' },
    update: { roleId: roleByName.get('Admin') },
    create: { name: 'Admin', email: 'admin@solusiklik.id', password, provider: 'local', roleId: roleByName.get('Admin') },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@solusiklik.id' },
    update: { roleId: roleByName.get('Sales') },
    create: { name: 'Sales Satu', email: 'sales@solusiklik.id', password, provider: 'local', roleId: roleByName.get('Sales') },
  });

  await prisma.user.upsert({
    where: { email: 'finance@solusiklik.id' },
    update: { roleId: roleByName.get('Finance') },
    create: { name: 'Finance Satu', email: 'finance@solusiklik.id', password, provider: 'local', roleId: roleByName.get('Finance') },
  });

  // 4. Sample leads for the Sales user
  const existing = await prisma.lead.count();
  if (existing === 0) {
    await prisma.lead.createMany({
      data: [
        {
          companyName: 'PT Maju Jaya', contactName: 'Budi Santoso', phone: '08123456789',
          email: 'budi@majujaya.co.id', source: 'Referral', estimatedValue: '50000000',
          status: LeadStatus.NEW, notes: 'Tertarik paket enterprise.', ownerId: sales.id,
        },
        {
          companyName: 'CV Sukses Mandiri', contactName: 'Siti Aminah', phone: '08987654321',
          email: 'siti@suksesmandiri.co.id', source: 'Website', estimatedValue: '120000000',
          status: LeadStatus.QUALIFIED, notes: 'Sudah demo, menunggu penawaran.', ownerId: sales.id,
        },
      ],
    });
  }

  console.log('Seed selesai.');
  console.log('Login default (password semua: password123):');
  console.log('  admin@solusiklik.id   (Admin)');
  console.log('  sales@solusiklik.id   (Sales)');
  console.log('  finance@solusiklik.id (Finance)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

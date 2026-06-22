/**
 * Single source of truth for every permission in the system.
 * Used by: the seed (to populate the Permission table), the roles API
 * (to show admins the full catalog), and the PermissionsGuard.
 *
 * Convention: key = "<feature>.<action>". A ".read.all" variant means
 * "see every record", while plain ".read" means "see only your own".
 */

export interface PermissionDef {
  key: string;
  feature: string;
  action: string;
  description: string;
}

export const PERMISSIONS: PermissionDef[] = [
  // Dashboard
  { key: 'dashboard.read', feature: 'dashboard', action: 'read', description: 'Lihat dashboard' },

  // Leads
  { key: 'lead.read', feature: 'lead', action: 'read', description: 'Lihat lead milik sendiri' },
  { key: 'lead.read.all', feature: 'lead', action: 'read.all', description: 'Lihat semua lead' },
  { key: 'lead.create', feature: 'lead', action: 'create', description: 'Tambah lead' },
  { key: 'lead.update', feature: 'lead', action: 'update', description: 'Ubah lead' },
  { key: 'lead.delete', feature: 'lead', action: 'delete', description: 'Hapus lead' },
  { key: 'lead.reassign', feature: 'lead', action: 'reassign', description: 'Pindahkan / alihkan kepemilikan lead' },

  // SPK
  { key: 'spk.read', feature: 'spk', action: 'read', description: 'Lihat SPK terkait' },
  { key: 'spk.read.all', feature: 'spk', action: 'read.all', description: 'Lihat semua SPK' },
  { key: 'spk.create', feature: 'spk', action: 'create', description: 'Konversi lead menjadi SPK' },
  { key: 'spk.update', feature: 'spk', action: 'update', description: 'Ubah SPK' },
  { key: 'spk.submit', feature: 'spk', action: 'submit', description: 'Kirim SPK ke Finance' },
  { key: 'spk.claim', feature: 'spk', action: 'claim', description: 'Klaim / kunci SPK untuk diperiksa' },
  { key: 'spk.assign', feature: 'spk', action: 'assign', description: 'Tugaskan SPK ke Finance tertentu' },
  { key: 'spk.approve', feature: 'spk', action: 'approve', description: 'Setujui SPK' },
  { key: 'spk.reject', feature: 'spk', action: 'reject', description: 'Tolak SPK' },
  { key: 'spk.cancel', feature: 'spk', action: 'cancel', description: 'Batalkan SPK (membatalkan lead juga)' },

  // Users
  { key: 'user.read', feature: 'user', action: 'read', description: 'Lihat daftar user' },
  { key: 'user.create', feature: 'user', action: 'create', description: 'Tambah user' },
  { key: 'user.update', feature: 'user', action: 'update', description: 'Ubah user' },
  { key: 'user.delete', feature: 'user', action: 'delete', description: 'Hapus user' },

  // Roles
  { key: 'role.read', feature: 'role', action: 'read', description: 'Lihat daftar role' },
  { key: 'role.create', feature: 'role', action: 'create', description: 'Tambah role' },
  { key: 'role.update', feature: 'role', action: 'update', description: 'Ubah role & hak akses' },
  { key: 'role.delete', feature: 'role', action: 'delete', description: 'Hapus role' },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

/** Default permission sets for the seeded starter roles. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ALL_PERMISSION_KEYS,
  Sales: [
    'dashboard.read',
    'lead.read',
    'lead.create',
    'lead.update',
    'lead.delete',
    'spk.read',
    'spk.create',
    'spk.update',
    'spk.submit',
  ],
  Finance: [
    'dashboard.read',
    'lead.read.all',
    'spk.read.all',
    'spk.claim',
    'spk.approve',
    'spk.reject',
    'spk.cancel',
  ],
  Viewer: ['dashboard.read'],
};

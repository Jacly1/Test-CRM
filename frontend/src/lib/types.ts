export type LeadStatus =
  | 'NEW'
  | 'CONTACTED'
  | 'QUALIFIED'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'CANCELLED';

export const LEAD_STATUSES: LeadStatus[] = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'CANCELLED',
];

export type SpkSalesStatus = 'DRAFT' | 'SUBMITTED';
export type SpkFinanceStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  permissions: string[];
  provider?: string;
}

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  provider?: string;
  isActive?: boolean;
  roleId?: string | null;
  role?: { id: string; name: string } | null;
  createdAt?: string;
}

export interface PermissionDef {
  key: string;
  feature: string;
  action: string;
  description: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  isDefault: boolean;
  userCount: number;
  permissionKeys: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
  source: string;
  estimatedValue: string;
  status: LeadStatus;
  notes?: string | null;
  ownerId: string;
  owner?: { id: string; name: string };
  spk?: Spk | { id: string; spkNumber: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Spk {
  id: string;
  spkNumber: string;
  leadId: string;
  lead?: { id: string; companyName: string; ownerId: string };
  projectName: string;
  contractValue: string;
  startDate: string;
  endDate: string;
  salesStatus: SpkSalesStatus;
  financeStatus: SpkFinanceStatus;
  financeNotes?: string | null;
  assignedFinanceId?: string | null;
  assignedFinance?: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryItem {
  id: string;
  entityType: 'LEAD' | 'SPK';
  entityId: string;
  fromStatus?: string | null;
  toStatus: string;
  notes?: string | null;
  createdAt: string;
  changedBy?: { id: string; name: string; role?: { name: string } | null };
}

export interface DashboardStats {
  scope: 'all' | 'own';
  leads: { total: number; byStatus: Record<string, number> };
  spk: { total: number; byFinanceStatus: Record<string, number>; awaitingVerification: number };
  users?: { total: number };
  roles?: { total: number };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

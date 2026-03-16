export type Role = 'Student' | 'Faculty' | 'Admin';

export type MOAStatus =
  | 'APPROVED: Signed by President'
  | 'APPROVED: On-going notarization'
  | 'APPROVED: No notarization needed'
  | 'PROCESSING: Awaiting signature'
  | 'PROCESSING: Sent to Legal'
  | 'PROCESSING: Sent to VPAA/OP'
  | 'EXPIRING'
  | 'EXPIRED';

export type AuditLog = {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  operation: 'Insert' | 'Edit' | 'Soft-Delete' | 'Recover';
  details?: string;
};

export type MOA = {
  id: string;
  hteId: string;
  companyName: string;
  address: string;
  contactPerson: string;
  contactEmail: string;
  industryType: string;
  effectiveDate: string;
  college: string;
  status: MOAStatus;
  isSoftDeleted: boolean;
  auditTrail: AuditLog[];
  createdAt: string;
  updatedAt: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  canEdit: boolean;
  isBlocked: boolean;
};

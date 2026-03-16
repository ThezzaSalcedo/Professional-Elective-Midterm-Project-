
export type Role = 'student' | 'faculty' | 'admin';

export type MOAStatus =
  | 'APPROVED: Signed by President'
  | 'APPROVED: On-going notarization'
  | 'APPROVED: No notarization needed'
  | 'PROCESSING: Awaiting signature'
  | 'PROCESSING: Sent to Legal'
  | 'PROCESSING: Sent to VPAA/OP'
  | 'EXPIRING'
  | 'EXPIRED';

export type AuditEntry = {
  userId: string;
  userName: string;
  operation: 'INSERT' | 'EDIT' | 'SOFT-DELETE' | 'RECOVER';
  timestamp: string;
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
  isDeleted: boolean;
  auditTrail: AuditEntry[];
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

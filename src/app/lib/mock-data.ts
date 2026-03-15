import { MOA, User } from './types';

export const mockUsers: User[] = [
  {
    id: 'u1',
    name: 'Admin User',
    email: 'admin@neu.edu.ph',
    role: 'Admin',
    canEdit: true,
    isBlocked: false,
  },
  {
    id: 'u2',
    name: 'Faculty Member',
    email: 'faculty@neu.edu.ph',
    role: 'Faculty',
    canEdit: false,
    isBlocked: false,
  },
  {
    id: 'u3',
    name: 'Student User',
    email: 'student@neu.edu.ph',
    role: 'Student',
    canEdit: false,
    isBlocked: false,
  },
];

export const mockMOAs: MOA[] = [
  {
    id: 'moa1',
    hteId: 'HTE-001',
    companyName: 'Global Tech Solutions',
    address: '123 Innovation Drive, Silicon Valley',
    contactPerson: 'John Smith',
    email: 'jsmith@globaltech.com',
    industryType: 'Technology',
    effectiveDate: '2024-01-15',
    college: 'College of Computer Studies',
    status: 'APPROVED: Signed by President',
    isDeleted: false,
    auditTrail: [
      {
        id: 'a1',
        userName: 'Admin User',
        timestamp: '2024-01-15T10:00:00Z',
        operation: 'Insert',
      },
    ],
  },
  {
    id: 'moa2',
    hteId: 'HTE-002',
    companyName: 'Healthy Eats Corp',
    address: '45 Market Street, Quezon City',
    contactPerson: 'Maria Clara',
    email: 'mclara@healthyeats.com',
    industryType: 'Food',
    effectiveDate: '2023-11-20',
    college: 'College of Arts and Sciences',
    status: 'PROCESSING: Sent to Legal',
    isDeleted: false,
    auditTrail: [
      {
        id: 'a2',
        userName: 'Admin User',
        timestamp: '2023-11-20T14:30:00Z',
        operation: 'Insert',
      },
    ],
  },
  {
    id: 'moa3',
    hteId: 'HTE-003',
    companyName: 'Future Finance Ltd',
    address: '88 Banking Way, Makati',
    contactPerson: 'Robert Tan',
    email: 'rtan@futurefinance.com',
    industryType: 'Finance',
    effectiveDate: '2022-05-10',
    college: 'College of Business Administration',
    status: 'EXPIRED',
    isDeleted: false,
    auditTrail: [
      {
        id: 'a3',
        userName: 'Admin User',
        timestamp: '2022-05-10T09:00:00Z',
        operation: 'Insert',
      },
    ],
  },
];
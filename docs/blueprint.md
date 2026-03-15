# **App Name**: MOA Track

## Core Features:

- Secure Google SSO Login: Enable secure user authentication exclusively through Google SSO using institutional email addresses.
- Role-Based Access Control (RBAC): Implement a robust RBAC system defining permissions for Students (view 'APPROVED' MOAs), Faculty (view all active MOAs, with configurable add/edit/delete rights), and Admins (superuser access, including user management).
- Comprehensive MOA Management: Allow authorized users to create, view, edit, and update MOA records. Admins have the additional ability to soft-delete and recover MOA entries, ensuring no data is permanently removed.
- AI-Powered Industry Classifier Tool: Leverage generative AI to suggest and auto-complete the 'Type of Industry' field based on the 'Company Name' or other provided information during MOA entry, improving data accuracy and efficiency.
- MOA Lifecycle Tracking & Display: Visualize MOA status throughout its lifecycle (e.g., APPROVED, PROCESSING, EXPIRING, EXPIRED) with dynamic display rules based on the user's role and MOA record state.
- Admin Audit Trail & User Management: Provide admins with a detailed audit trail of all modifications (User, Date, Time, Operation Type) to MOA records and tools to manage user accounts (block/unblock, assign Faculty permissions).
- Dynamic Analytics Dashboard & Global Search: Present an analytics dashboard with cards displaying statistical counts of MOAs (active, processing, expired), filterable by College and Date Range. Include a global search bar for querying across multiple MOA fields.

## Style Guidelines:

- Primary color: A deep, professional blue (#336699) conveying reliability and academic authority.
- Background color: A subtle, light blue-gray (#F0F3F6) providing a clean, calm, and professional backdrop for data presentation.
- Accent color: An elegant indigo (#6A4BB2) for interactive elements and highlights, ensuring clear calls to action and visual distinction.
- Body and headline font: 'Inter' (grotesque sans-serif) for its modern, objective, and highly legible characteristics, suitable for clear data display and readability across the application.
- Use a set of clear, minimalist line-style icons for navigation and administrative actions (e.g., edit, delete, view, search, filter), ensuring immediate recognition and a professional aesthetic.
- Implement a dashboard-centric layout for analytics, clear data tables with sortable columns, and well-organized forms for MOA entry, emphasizing information hierarchy and user efficiency.
- Incorporate subtle, functional animations for feedback on user interactions (e.g., button presses, successful data saves, filter changes) to enhance perceived responsiveness without causing distraction.
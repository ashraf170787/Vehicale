# Security Specification & Threat Model

## 1. Data Invariants
1. Only authenticated users with verified email (`request.auth.token.email_verified == true`) or bootstrapped admin (`ashraf170787@gmail.com`) can read or write fleet operational data.
2. Inactive/unauthenticated requests are denied by default across all documents.
3. Document IDs must conform to `isValidId` (`size <= 128` and matching `^[a-zA-Z0-9_\-]+$`).
4. Financial quantities (amount, paidAmount, dueAmount, netSalary, contractAmount) must be numbers and cannot contain arbitrary code, oversized payloads, or negative exploit buffers.
5. All vehicle transactions must reference a non-empty vehicle number.
6. Admin records (`/admins/{adminId}`) cannot be created or modified by arbitrary users to prevent self-assigned privilege escalation.
7. Updates must preserve immutable primary IDs and createdAt fields.

## 2. The "Dirty Dozen" Payloads (Must be Rejected)
1. **Unauthenticated Read/Write**: Anonymous request writing to `/vehicles/veh-1`.
2. **Unverified Email Write**: Authenticated user with `email_verified == false` attempting to write to `/maintenance/maint-1`.
3. **ID Poisoning / Path Traversal**: Document ID containing special characters or >128 chars (`/vehicles/../../../etc/passwd`).
4. **Oversized Buffer Injection Attack**: Payload with string fields exceeding max length constraints (>1MB memory attack).
5. **Ghost Field / Shadow Property Injection**: Payload containing unexpected `isAdmin: true` or `escalatedRole: superadmin` in vehicle record.
6. **Non-Numeric Amount Exploit**: Writing string/array into `amount` field in `maintenance` or `fuel`.
7. **Self-Promoted Admin Privilege Escalation**: Non-admin user creating document in `/admins/{uid}` with `role: "admin"`.
8. **Negative Financial Bypass**: Payload attempting negative amounts or illegal state overrides.
9. **Missing Mandatory Fields**: Maintenance transaction created without `date` or `serviceType`.
10. **Immutable Field Tampering**: Updating an existing vehicle and changing its original `id` or `createdAt`.
11. **Client Timestamp Spoofing**: Supplying corrupted client timestamp formats.
12. **Illegal Enum Transition / Enum Tampering**: Setting paymentStatus to `HackedState` instead of allowed enum values.

## 3. Test Runner Invariant Checks
All 12 attacks are tested against security rules ensuring default deny and strict schema validations.

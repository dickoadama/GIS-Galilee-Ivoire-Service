# Security Specification — GIS Galilée Ivoire Service

## 1. Data Invariants
1. **Strict RBAC & Role Hierarchy**:
   - `super_admin` (bootstrapped via verified `cimentq@gmail.com` or `members` entry assigned by Super Admin) has universal read/write access across all collections including `auditLogs` and `admin_patron` promotions.
   - `admin_patron` (Patron) can manage `members` with worker roles (`caisse`, `chargeur`, `chauffeur`, `gerant_boisson`, `gerant_ciment`), manage `settings`, `products`, and `invoices`. A Patron CANNOT create or demote a `super_admin`.
   - `gerant_ciment` can update stock/prices ONLY for `pole in ['ciment', 'quincaillerie']`.
   - `gerant_boisson` can update stock/prices ONLY for `pole == 'boissons'`.
   - `caisse` can create/update/read `invoices` (Factures & Devis).
   - `chargeur` and `chauffeur` can read `invoices` and update fulfillment/assignment fields (`status`, `assignedLoaderName`, `assignedDriverName`, `updatedAt`).
   - Standard `client` users can read `products`/`settings`, create `invoices` (quotes/orders) with `createdByUid == request.auth.uid`, and read/list only their own invoices.
2. **PII Isolation**:
   - `users/{userId}/private/info` is readable/writable only by the owner (`userId == request.auth.uid`) or `isSuperAdmin()`.
3. **Immutable Audit & Ownership**:
   - `createdAt` and `createdByUid` / `senderUid` / `actorUid` are immutable after creation and validated against `request.auth.uid` and `request.time`.
4. **No Unbounded Arrays or Ghost Fields**:
   - All `create` operations validate `keys().hasAll(...) && keys().hasOnly(...)` and all `update` operations enforce `affectedKeys().hasOnly(...)` per action plus the full entity validator.

## 2. The "Dirty Dozen" Payloads (Expected `PERMISSION_DENIED`)
1. **Self-Privilege Escalation on Signup**: `users/{uid}` created with `role: 'super_admin'` or `role: 'admin_patron'` by non-super-admin.
2. **Role Tampering on Profile Update**: User updating their own `users/{uid}` doc changing `role` from `'client'` to `'caisse'`.
3. **Patron Promoting Self to Super Admin**: `admin_patron` writing `members/{id}` with `role: 'super_admin'`.
4. **Cross-Pole Stock Modification**: `gerant_boisson` updating a `ciment` product's `priceFcfa`.
5. **Cross-Pole Stock Modification 2**: `gerant_ciment` updating a `boissons` product's `stockQty`.
6. **Ghost Field Injection on Invoice**: Creating an invoice with extra shadow field `isPaidOverride: true`.
7. **Timestamp Forgery**: Creating a chat message with backdated `createdAt` (`!= request.time`).
8. **Sender Impersonation**: Creating a chat message with `senderUid` different from `request.auth.uid`.
9. **ID Poisoning**: Creating a document at `/products/<200-char-invalid-id!@#>` bypassing `isValidId()`.
10. **PII Cross-Read**: User A reading `/users/{userB}/private/info`.
11. **Non-Participant Conversation Read**: User C reading a `direct` conversation where `request.auth.uid` is not in `participantUids`.
12. **Client Deleting Finalized Invoice**: Client user attempting `delete` on `/invoices/{id}`.

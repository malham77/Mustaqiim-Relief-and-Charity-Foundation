# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Public CMS Collections** (`site_content`, `hero_slides`, `campaigns`, `stories`, `media`, `qurbani_options`, `faqs`, `programmes`, `donation_tiers`):
   - Readable by any visitor (public website content).
   - Writable ONLY by verified Admins (`request.auth != null && request.auth.token.email_verified == true` and either bootstrapped admin `maleham06@gmail.com` or present in `/admins/{uid}`).
   - Every create/update validates strict key allowlists (`hasAll` + `hasOnly`), field types, string max lengths, numeric bounds, and server timestamp `request.time`.
2. **Public Submission Collections (PII Isolation)** (`contact_inquiries`, `data_deletion_requests`):
   - Public visitors may `create` ONLY if `age_consent == true`, initial `status` is locked (`'new'` or `'pending'`), `createdAt == request.time`, `updatedAt == request.time`, and strict field keys/sizes pass.
   - `read` (`get`, `list`), `update`, and `delete` are strictly restricted to verified Admins (`isAdmin()`). No non-admin can read, enumerate, or tamper with another person's inquiry or deletion request.
3. **Admin Access Control** (`/admins/{uid}`):
   - Only verified Admins can read or modify `/admins/{uid}`. Users cannot self-assign admin privileges.

## 2. The "Dirty Dozen" Attack Payloads (All Must Fail with PERMISSION_DENIED)
1. Unauthenticated write to `/site_content/settings`
2. Authenticated non-admin write to `/campaigns/qurbani-2026`
3. Unverified email (`email_verified: false`) attempting admin write to `/hero_slides/slide-1`
4. Shadow field injection (`isVerified: true` or `extraField: "x"`) on `/contact_inquiries/{id}`
5. Submitting `/contact_inquiries/{id}` with `age_consent: false`
6. Submitting `/contact_inquiries/{id}` with pre-set `status: "resolved"` instead of `"new"`
7. Client-forged timestamp (`createdAt` != `request.time`) on `/data_deletion_requests/{id}`
8. Unauthenticated `get` or `list` on `/contact_inquiries` (PII scraping)
9. Unauthenticated `get` or `list` on `/data_deletion_requests` (PII scraping)
10. Authenticated non-admin self-creating `/admins/{myUid}` (privilege escalation)
11. Resource poisoning: >128-char invalid document ID or >4000-char description string on `/campaigns/{id}`
12. Value poisoning: setting `target_amount: -500` or string `"100"` on `/campaigns/{id}`

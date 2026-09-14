# Company Verification (manual admin review)

Today "vetted" only means "paid". This adds a real, admin-reviewed verification record for each company, with document upload, a review queue, and a visible badge.

## 1. Data

New table `company_verifications` (one active record per company, history kept):

- `user_id` — the company owner
- `registration_number`, `registration_country`, `legal_name`
- `year_founded` (years operating derived from it)
- `status` — unverified / pending / verified / rejected / expired
- `submitted_at`, `reviewed_at`, `reviewed_by` (admin user), `review_notes` (internal), `rejection_reason` (shown to the user)
- `verified_until` — verification expires after 12 months
- standard created/updated timestamps

New table `company_verification_documents`:

- `verification_id`, `user_id`
- `doc_type` — certificate_of_incorporation / tax_clearance / vat_or_tin / business_licence / bank_letter / other
- `storage_path`, `file_name`, `mime_type`, `size_bytes`, `uploaded_at`

On `profiles`, two read-only display fields kept in sync by a trigger so listings/badges need no join: `verification_status`, `verified_at`. Clients cannot write them (same protection pattern already used for subscription fields).

## 2. States and transitions

```text
unverified --submit--> pending --admin approve--> verified --12 months--> expired
                          |                                                  |
                          +--admin reject--> rejected --resubmit--> pending <-+
```

- **submit**: company fills the form and uploads the required documents; requires a completed profile (company name + expertise).
- **approve / reject**: admin only, in the review queue. Reject requires a reason, which the company sees.
- **expire**: daily job flips verified records past `verified_until` to expired and notifies the owner.
- Resubmission creates a new submission; the previous record stays as history.

## 3. Documents

Asked for at submission: certificate of incorporation (required), tax clearance (required), business licence or trade permit (required if the country issues one), plus optional VAT/TIN certificate and bank reference letter. PDF/JPG/PNG, max 10MB each.

Stored in a **private** storage bucket `company-documents`, paths `\{user_id\}/\{verification_id\}/\{doc_type\}-\{timestamp\}.\{ext\}`.

Access rules: an owner can upload, list and read only files under their own folder and cannot delete once the submission is pending or verified; admins can read all; nobody else has any access; no public URLs — admins view files through short-lived signed links generated on demand.

## 4. Admin review queue

New admin page `/admin/verifications` (admin-only route, linked from the admin dashboard with a pending count).

The reviewer sees: queue filtered by status, oldest pending first; per submission — company name, legal name, registration number and country, years operating, website, contact email, submitted date, and each document with a preview/download link. Actions: **Approve** (sets verified, records reviewer + date, sets a 12-month expiry) or **Reject** (requires a reason from a short list plus free text). Internal notes are saved on the record and never shown to the company.

## 5. What a verified company sees

- A "Verified" badge next to the company name on their dashboard and profile page.
- A verification card on the profile page showing status and, for rejected submissions, the reason and a resubmit button; for verified, the verified-since and expiry dates with a renew prompt in the last 30 days.
- Partnership applications carry the badge so counterparties can see it.
- Rejected and expired companies get a clear next step, not a dead end.

## 6. Enforcement

Verification is **display-only at first** — nothing is blocked by it, so nothing currently working breaks. The one behavioural change proposed: submitting a **partnership application** requires verified status, since that is where a counterparty relies on the claim. Bid Studio, listings and Pro features stay gated on subscription only.

Site copy is corrected so "vetted" means verified, not paid.

## Technical notes

- Tables in `public` with GRANTs, RLS on: owner can read own records and insert a submission; owner can update only while status is unverified/rejected; admins (via `has_role`) can read all and update status fields; no deletes.
- Trigger mirrors status onto `profiles`; a second trigger blocks client writes to the mirrored columns.
- Status transitions validated in a trigger (only legal moves allowed), and approve/reject go through an admin-only edge function using the service role so the reviewer identity is recorded server-side and cannot be spoofed.
- Expiry runs as a daily cron job alongside the existing `expire-listings-daily`.
- Email notifications (submitted / approved / rejected / expiring) reuse the existing notify.middlbrand.com sender.

# Bugs Found — Archway Stress Test

## CRITICAL

### BUG-01: API routes missing try/catch on DB mutations — FIXED
Multiple API routes had no error handling around Prisma operations. If a record doesn't exist or a constraint fails, the server returned an unhandled 500 instead of a proper error.
- `src/app/api/properties/[id]/insurance/[policyId]/route.ts` (PATCH)
- `src/app/api/properties/[id]/taxes/[taxId]/route.ts` (PATCH/DELETE)
- `src/app/api/properties/[id]/inspections/[inspectionId]/route.ts` (PATCH/DELETE)
- `src/app/api/rehabs/[id]/milestones/[milestoneId]/route.ts` (PATCH/DELETE)
- `src/app/api/users/[id]/route.ts` (PATCH)
- `src/app/api/tasks/[id]/route.ts` (DELETE)
- `src/app/api/rehabs/[id]/route.ts` (DELETE)
**Fix:** Wrapped all DB mutations in try/catch, return 404 on not found.

### BUG-02: DELETE operations missing activity log — FIXED
Domain rule requires all mutations logged. These DELETEs silently skipped logging:
- `src/app/api/properties/[id]/taxes/[taxId]/route.ts`
- `src/app/api/properties/[id]/city-notices/[noticeId]/route.ts`
- `src/app/api/properties/[id]/documents/[docId]/route.ts`
- `src/app/api/properties/[id]/photos/[photoId]/route.ts`
- `src/app/api/properties/[id]/inspections/[inspectionId]/route.ts`
- `src/app/api/tasks/[id]/route.ts`
- `src/app/api/rehabs/[id]/route.ts`
**Fix:** Added activity log entries to all DELETE handlers.

### BUG-03: PATCH operations missing activity log — FIXED
- `src/app/api/properties/[id]/inspections/[inspectionId]/route.ts`
- `src/app/api/rehabs/[id]/milestones/[milestoneId]/route.ts`
**Fix:** Added activity log entries to both PATCH handlers.

## HIGH

### BUG-04: Missing loading.tsx for 8 settings/detail pages — FIXED
Pages showed blank screen during data fetch:
- `src/app/settings/users/`
- `src/app/settings/categories/`
- `src/app/settings/preferences/`
- `src/app/settings/activity/`
- `src/app/settings/entities/`
- `src/app/tasks/[id]/`
- `src/app/bills/[id]/`
- `src/app/import/`
**Fix:** Created loading.tsx with SettingsPageSkeleton/DetailPageSkeleton for all 8 pages. Also added SettingsPageSkeleton to page-skeleton.tsx. Updated LoadingShell to include sticky top header matching AppShell layout.

### BUG-05: Missing admin role check on entities and activity pages — FIXED
Any logged-in user (staff, pm) could manage entities and view activity log.
- `src/app/settings/entities/page.tsx` — no role check
- `src/app/settings/activity/page.tsx` — no role check
**Fix:** Added Supabase auth + Prisma admin role check, redirect non-admins to /dashboard.

### BUG-06: User manager — no email format validation — FIXED
`src/components/settings/user-manager.tsx` accepted any string as email (e.g. "abc").
**Fix:** Added regex email validation `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` before API call.

### BUG-07: Inconsistent DELETE response format — FIXED
Some routes returned `{ ok: true }`, others `{ success: true }`:
- `src/app/api/tasks/[id]/route.ts` → was `{ ok: true }`
- `src/app/api/rehabs/[id]/route.ts` → was `{ ok: true }`
- `src/app/api/rehabs/[id]/milestones/[milestoneId]/route.ts` → was `{ ok: true }`
- `src/app/api/properties/[id]/inspections/[inspectionId]/route.ts` → was `{ ok: true }`
**Fix:** Standardized all DELETE responses to `{ success: true }`.

### BUG-08: Lease API returns Prisma Decimal objects instead of numbers — FIXED
`src/app/api/properties/[id]/leases/route.ts` (POST) and `leases/[leaseId]/route.ts` (PATCH) returned raw Decimal fields (contractRent, hapAmount, tenantCopay, etc.) which serialize as objects, not numbers.
**Fix:** Added explicit Number() conversion for all Decimal fields before JSON response.

## MEDIUM

### BUG-09: Preferences number inputs accept invalid values — FIXED
`src/components/settings/preferences-manager.tsx` — typing "0" or negative numbers in threshold fields created invalid config.
**Fix:** Added client-side validation before save: PM fee 0-100, thresholds must be positive and ascending (warning < urgent < critical), escalation/expiry >= 1.

### BUG-10: Category manager uses stale closure — FIXED
`src/components/settings/category-manager.tsx` line 91: `categories[catIndex].value` read from outer scope which could be stale during rapid edits.
**Fix:** Moved expanded-set update inside setCategories callback to read from latest state.

### BUG-11: Global search — no error handling on fetch failure — FIXED
`src/components/shared/global-search.tsx` — network error during search silently failed, loading spinner never cleared.
**Fix:** Added proper error handling: clear results on non-ok response or catch, always clear loading state.

### BUG-12: Sidebar userName null safety — FIXED
`src/components/shared/sidebar.tsx` line 139: `userName.charAt(0)` throws if userName is somehow empty string.
**Fix:** Changed to `(userName?.[0] ?? 'U').toUpperCase()`.

### BUG-13: Activity log client component — no fetch error handling — FIXED
`src/components/settings/activity-log.tsx` — fetch failure caused silent break with no user feedback.
**Fix:** Added try/catch, error state, and retry button in the UI.

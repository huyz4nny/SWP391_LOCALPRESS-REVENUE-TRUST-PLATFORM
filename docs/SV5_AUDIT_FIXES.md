# SV5 audit: real ad delivery and administration

## Changes

- Real-mode AdSlotBanner uses `GET /api/v1/delivery/ad-slots/{slotCode}/serve`; it never selects mock campaigns in real mode.
- Eligibility requires active slot, current dates, APPROVED/ACTIVE campaign, PAID payment, accepted quotation, contract reference and an APPROVED safe creative. SUSPENDED campaigns are excluded.
- The highest APPROVED creative version is selected; a pending replacement does not replace the old approved banner.
- Equal-weight rotation applies when multiple campaigns are eligible. Media/target must be valid HTTP(S) URLs accessible to the reader.
- Ad-free ALL subscriptions suppress the banner before allocating a tracking ticket.
- The browser reports an impression after image load; a click requires an impression. Both use the issued token, not arbitrary campaign IDs/counters.

## Statistics limits

Tracking tickets are valid for ten minutes and stored in the backend process (up to approximately 10,000 live tickets). Replaying the same event is rejected. Counts are persisted in `ad_stats` with CTR = clicks / impressions * 100.
This is replay protection, not a complete bot/fraud detection system. Multiple instances require a shared ticket/deduplication store before production scaling; restarting a process invalidates its outstanding tickets.
No fake counters or mock fallback is used when the real API fails.

## Real admin endpoints

All endpoints below require SYSTEM_ADMIN, including a database check of the active actor:

| Method | URL | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/users` | Users without password hashes |
| PUT | `/api/v1/admin/users/{id}/update-role` | Supported backend roles; self-demotion rejected; audit appended |
| GET | `/api/v1/admin/audit-logs` | Latest 200 recorded events |
| GET | `/api/v1/admin/ad-delivery-status` | Eligible campaigns and today's persisted counts per slot |
| GET/PUT | `/api/v1/admin/paywall-settings` | Read/save effective preview word cap |

Policy revisions are append-only JSON records in the existing audit_logs table. No new Flyway migration is needed; V7 and V8 remain unchanged.
The preview word cap is applied in addition to the maximum 30% character preview. Changing it cannot expose full Premium content.
Paywall remains enabled. Device limits belong to the shared identity/device-session work; article prices belong to article metadata. Unsupported watermark/device/price controls are not offered as working settings.
The UI shows API errors instead of reporting zero/success when requests failed. Dashboard values are computed from API responses.

## Ownership and integration

SecurityConfig has two narrowly scoped permitAll rules for public ad serving/tracking; the admin route remains protected. Leader should review this integration.
Delivery reads campaign/payment/creative eligibility. It does not activate payments or replace SV1 payment/refund event listeners.
The reader service only consumes the preview word cap. `PaywallEngine.checkCurrentAccess(articleId)` remains the public reader integration; `checkAccess(userId, articleId)` is an internal contract.

## Checks

Run backend tests for AdServingServiceTest, AdminAccessTest, AdminMutationTest, PaywallPolicyTest, Sv5EndpointSecurityTest, PaywallEngineTest and ReaderArticleServiceTest.
Run `npm test`, `npm run build`, `npm run lint` in frontend.

The delivery SQL was exercised against a disposable MySQL schema: paid/approved eligible; unpaid, suspended, expired, inactive slot, pending creative and missing contract excluded; approved replacement selected only after approval. Application databases were not changed by these checks.
Restart backend before manually verifying these new endpoints; existing running processes may still serve the previous build.

# SV5 audit: real ad delivery and administration

## Changes

- Real-mode AdSlotBanner uses `GET /api/v1/delivery/ad-slots/{slotCode}/serve`; it never selects mock campaigns in real mode.
- Eligibility requires active slot, current dates, APPROVED/ACTIVE campaign, PAID payment, accepted quotation, contract reference and an APPROVED safe creative. SUSPENDED campaigns are excluded.
- The highest APPROVED creative version is selected; a pending replacement does not replace the old approved banner.
- Equal-weight rotation applies when multiple campaigns are eligible. Media/target must be valid HTTP(S) URLs accessible to the reader.
- Ad-free ALL subscriptions suppress the banner before allocating a tracking ticket.
- The browser reports an impression after image load; a click requires an impression. Both use the issued token, not arbitrary campaign IDs/counters.

## Statistics limits

Tracking tickets are valid for ten minutes and stored in the backend process, bounded to 10,000 live tickets. At capacity the oldest ticket is evicted; serving does not return an empty offer merely because the store is full. Completing a click releases its ticket. Replaying the same event is rejected. Counts are persisted in `ad_stats` with CTR = clicks / impressions * 100.

The public serve endpoint allows 60 requests per minute per servlet peer IP and returns HTTP 429 above that budget, before querying campaign inventory. Other IPs keep their budget. The peer map is also bounded to 10,000 entries. Raw X-Forwarded-For is not trusted; deployments behind a reverse proxy must configure trusted forwarding correctly so the servlet peer is meaningful. Users sharing a NAT also share its rate budget.

Evicted/expired tokens no longer count events: under extreme pressure the policy favors continued banner availability over retaining every outstanding tracking ticket. Both rate limiting and token state are per process; shared/distributed protection remains necessary for multiple instances.
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

Policy revisions are append-only JSON records in the existing audit_logs table. No new Flyway migration is introduced by this review fix; existing migrations remain unchanged. Reads use a process-local cache with a 60-second TTL and synchronized cache refill. Saves invalidate the local cache after commit, not on rollback. Other instances and out-of-band database changes become visible on cache expiry.

`PaywallEngine.buildLockedPreview(rawContent)` applies the configured word cap in addition to the maximum 30% character preview. SV3 must call this helper in its locked-content branch; PR #23 does not modify ReaderArticleServiceImpl. The Reader behavior from main keeps its existing 30% protection until SV3 integrates the optional word cap.
Paywall remains enabled. Device limits belong to the shared identity/device-session work; article prices belong to article metadata. Unsupported watermark/device/price controls are not offered as working settings.
The UI shows API errors instead of reporting zero/success when requests failed. Dashboard values are computed from API responses.

## Ownership and integration

SecurityConfig has two narrowly scoped permitAll rules for public ad serving/tracking; the admin route remains protected. Leader should review this integration.
Delivery reads campaign/payment/creative eligibility. It does not activate payments or replace SV1 payment/refund event listeners.
Reader code and its tests are unchanged from main, as is frontend/src/lib/http/client.ts. AGENTS.md is absent from the tracked tree and is not part of the PR diff. The handoff summary is included below rather than in an agent memory file. A longer local copy is available at docs/SV5_PAYWALL_CONTRACT.md; that new file stays ignored under main's /docs/ rule and is intended to be sent to the leader, not force-added to Git.
`PaywallEngine.checkCurrentAccess(articleId)` remains the reader integration; `checkAccess(userId, articleId)` is an internal contract. The new preview helper belongs to delivery and is tested there.

## Checks

Run backend tests for AdServingServiceTest, AdminAccessTest, AdminMutationTest, PaywallPolicyTest, Sv5EndpointSecurityTest, PaywallEngineTest and ReaderArticleServiceTest.
Run `npm test`, `npm run build`, `npm run lint` in frontend.

The delivery SQL was exercised against a disposable MySQL schema: paid/approved eligible; unpaid, suspended, expired, inactive slot, pending creative and missing contract excluded; approved replacement selected only after approval. Application databases were not changed by these checks.
Restart backend before manually verifying these new endpoints; existing running processes may still serve the previous build.

## PR #23 review verification (2026-10-31)

- Merged origin/main (including PR #28); resolved client.ts using main's complete file.
- Backend: `mvn -B -Dlocalpress.it=true test` against a newly-created isolated MySQL schema: 278 tests, 0 failures/errors, 1 existing disabled reader routing test. The temporary schema/user were removed after the run. Flyway V1–V11 applied successfully.
- Frontend: `VITE_USE_MOCK_API=true npm test`: 94 passed. The SV2 booking queue suite switches mockStore users and needs mock mode for this run. Running npm test against the local real-API .env initially produced 11 connection-refused errors because no backend was listening; no application data was used for that suite.
- `npm run build`: passed; existing bundle-size warning remains.
- Regression tests cover cache hits/TTL/commit/rollback, 30% plus word-limit preview, concurrent peer budgets, spoofed forwarding headers, token expiry and more than 10,000 issued offers without global serving denial.

## PaywallEngine handoff for the shared team document

Use `checkCurrentAccess(articleId)` for the authenticated request; `checkAccess(userId, articleId)` is trusted internal-only. Both return `Decision(allowed, reason)` and only consider published articles. Free content needs no login. Premium needs an active/unlocked user and a valid article purchase or in-scope subscription.

SV3's locked branch can call `response.setPreviewContent(paywallEngine.buildLockedPreview(rawContent));`, then `response.setContent(null); response.setIsLocked(true);`. The helper takes the published text, returns at most 30% of its UTF-16 character length and the configured word limit, and handles null/short content safely. It does not grant entitlement or sanitize HTML. SV3 retains ownership of applying this helper in the Reader response. Policy reads have a 60-second process cache and local invalidation after commit.

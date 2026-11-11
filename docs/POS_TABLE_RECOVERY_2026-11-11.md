# Table products returning after collection or deletion

Two faults were reproduced in the actual POS component with simulated orders and network responses:

1. Reloading a loaded table restored its products from local storage but lost `billingOrderIds`. It then became an ordinary counter cart: collection could create a new sale while leaving the original table account pending.
2. Rapidly deleting three lines while the first PATCH was delayed left the UI empty, but the saved account still contained two lines worth €6. Optimistic rendering removed the order from the data used by the next queued edit, so that edit skipped the final PATCH.

## Corrections

- Queued edits receive the previous write's confirmed account baseline, including IDs, items and table, independently of optimistic display state. The final empty snapshot therefore sends the required cancellation.
- Pending-table reads have a mutation generation and coalesced follow-up refresh. A read started before an edit, send or collection cannot overwrite the newer state. Confirmed empty accounts use the same temporary stale-read suppression as collected accounts.
- Local cart snapshots atomically include products and their original order IDs. The existing remote backup also stores these references in nullable `pos_carts.cart_context` metadata. Item arrays and existing carts are preserved.
- Restoring a linked table verifies the exact order IDs under the current tenant. Closed accounts are not restored; unresolved accounts are loaded from their saved records. A failed verification retains the recovery snapshot and blocks collection until an explicit retry succeeds.
- Legacy carts without identity are preserved for review. They require explicitly selecting the existing account in Salón or confirming a new standalone sale; selecting a table does not send the legacy products again.

Migration `20261111161636_pos_cart_account_context.sql` was applied to Eccofood. It adds one nullable JSONB metadata column with a three-second lock timeout. Existing RLS remained enabled with four policies; no financial rows were edited for this repair.

## Verification

- 285 unit tests and TypeScript check passed; production build passed.
- `scripts/verify-pos-table-recovery.mjs` runs the real POS with mocked network and payments. It covers reloading then collecting the original account without a new sale; deleting all lines while an old read is delayed; rapid X presses while the first save is delayed; already-paid cached accounts; legacy cart identification without a duplicate POST; and failed network verification followed by successful retry.
- Existing browser flows also passed for manual prices, catalog items at different prices, editing, renaming, split payments, full collection, and previous operational-day accounts.

The browser script requires Playwright and esbuild, available normally from the project or through `ECCOFOOD_BROWSER_PACKAGE` pointing to a package.json that resolves those dependencies. `ECCOFOOD_BROWSER_EXECUTABLE` can select an existing Chromium binary. It makes no requests to production and performs no real payments.

Existing pending accounts were not automatically deleted, cancelled, or marked paid based on similar-looking sales. Their historical payment state cannot be inferred from matching products alone.

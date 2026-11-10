# Previous table accounts — 10 November 2026

## Observed incident

El Cruce showed table 1 occupied for 932 minutes with a €10 account. Read-only inspection found an existing pending, unpaid order created on 9 November at 15:47 Europe/Madrid and last edited at 20:04. Its contents were two €4 bottles and one €2 manual charge. It was not a newly inserted order at the time of the report.

The POS fetched pending dine-in orders without a business-day boundary and grouped every fetched account by table number. Opening or refreshing the POS therefore placed an unresolved account from yesterday on today's table. The account was not linked to a cash closing. This does not establish whether the customer had already paid through a different receipt; no historical financial records were changed.

## Change

- Partition the fetched accounts using the restaurant's configured operational closing time and time zone, using the existing 05:00 default when no overnight schedule is configured.
- Show only the current operational day's accounts in the table strip, map, and current commands list.
- Keep unresolved earlier accounts accessible through **Cuentas anteriores** and the **Anteriores** tab, including their date, order number, products, and amount. Review loads one account explicitly, without merging it with today's account on the same table.
- Label a loaded previous account with its original date. Protect an existing cart from being replaced when opening a previous account.
- Save additions to an explicitly loaded previous account on that account, rather than creating a new current-day table order. Optimistic replacement takes its metadata from the selected account IDs.
- Include operating hours in the existing bootstrap query; no new recurring requests or database migrations.

This is a display and account-selection correction. It does not automatically cancel old accounts, mark them paid, move their dates, or prove why an original payment remained pending.

## Validation

- TypeScript check and 276 unit tests passed. New tests cover exact closing boundaries, overnight service, Colombia and Spain time zones, custom operating hours, Spain's autumn daylight-saving transition, unchanged records, and invalid/future dates retained for review.
- Isolated real POS browser flow: €10 previous account and €6 current account on table 1; edit/collect current account at €9 without changing the previous account; explicitly load previous account at €10, add €3, reload and collect at €13; no new orders created. Focus refresh preserves separation.
- Old-only table shows free today; previous products remain visible; an unsaved €3 cart is preserved when trying to review another account. Checked at 1024×600 and 1366×768.
- Existing browser regressions passed for multiple manual prices, catalog products at different prices, renaming a manual line, split payment, and final collection.
- Browser data and payments were simulated; production inspection was read-only.

## Follow-up: different amount when retrieving a table

The user reported another discrepancy and explained that table 1 is used to hold pending accounts. They could not recall the before/after amounts. The latest account inspected had €11.80 in stored line items and €11.80 in its order total; the edit audit also reported €11.80 before and after. This does not identify the exact reported discrepancy.

Two independent bugs were reproduced in the real POS using simulated data before changing the code:

1. Two distinct commands with identical products (two coffees at €3 in each command) were deduplicated by content. The database held €12, but the POS loaded €6 and would leave the other command pending. Deduplication now uses saved order identity, while the existing reconciliation still removes temporary/server aliases after a save.
2. A €2 tip set on a previous draft carried over when loading a saved €6 table, showing €8 to collect. Loading a table now clears the previous draft's payment adjustments, payment entry, receipt/delivery context, and previous-day registration, and invalidates outstanding cart restores before restoring the saved products.

Table switching/retrieval is also guarded during an outstanding send, table edit, or payment. The internal split-payment continuation explicitly retains its existing ability to restore the remaining account.

Validation: 278 unit tests and the TypeScript check passed. Browser flows verified both identical accounts are collected for €12; two sequential €6 sends also load and collect €12; retrieval is disabled during a delayed save; a previous €2 draft tip no longer changes a saved €6 table. Existing manual-price, catalog-price, split-payment, renamed-line, and previous-day account browser scenarios passed again. No real financial records were changed. Multiple commands sent to the same table still accumulate; the existing **Guardar** flow remains available for independent held accounts.

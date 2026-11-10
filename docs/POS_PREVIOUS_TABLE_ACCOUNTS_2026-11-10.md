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

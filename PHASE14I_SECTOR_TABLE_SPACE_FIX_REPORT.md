# Phase 14I — Sector Audit Table Space Fix

## Change
Removed the `Index` column from the `/sectors` full audit table to save horizontal space and keep the audit table focused on presentation-useful sector pressure values.

## Kept
- Sector
- Turnover
- Buy Amount
- Sell Amount
- Ambig Amount
- Buy %
- Sell %
- Ambig %
- Shares
- Tx
- Same-Broker
- Evidence

## Also updated
The sector search placeholder now says `Search sector` instead of `Search sector or index code`.

## Truth policy
No data logic changed. This is a presentation-only cleanup.

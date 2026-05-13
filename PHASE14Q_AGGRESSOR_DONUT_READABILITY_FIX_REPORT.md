# Phase 14Q · Aggressor Donut Readability Fix

This update fixes the Today’s Market Story aggressor amount mix chart.

## Problem fixed
- Percentage labels on the donut ring overlapped with the center value.
- The 0.3% ambiguous slice label was too small to read inside the chart.
- Net amount and composition labels were visually competing.

## New rule
- Donut ring = composition only: buy aggressor amount, sell aggressor amount, ambiguous amount.
- Donut center = only net aggressor amount and bias label.
- Exact amounts and percentages are shown in the right-side legend/table.

## Result
The chart is cleaner, easier to read, and more presentation-friendly.

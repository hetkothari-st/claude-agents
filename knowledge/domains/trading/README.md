# Trading / Stock Market

## Reference apps
| Name | URL | Why included |
| ---- | --- | ------------ |
| TradingView | https://www.tradingview.com/chart | Charting density gold standard; multi-pane layouts. |
| Bloomberg Terminal (web) | https://www.bloomberg.com/professional | Order book, ticker tape conventions. |
| ThinkOrSwim | https://www.schwab.com/trading/thinkorswim | Pro retail UI; option chains. |
| Robinhood | https://robinhood.com | Consumer-friendly trading; clean defaults. |
| IBKR (Client Portal) | https://www.interactivebrokers.com/portal | Pro multi-account workflows. |
| Zerodha Kite | https://kite.zerodha.com | Indian markets reference; minimal density. |
| Groww | https://groww.in | Mobile-first retail; warm palette deviation. |

## Palette
- Base/surface: dark stack `#0b0d10` → `#13171c` → `#1b2027`. Light variant: `#ffffff` → `#f7f8fa` → `#eef0f3`.
- Accent: cyan/teal `#0ea5e9` (TradingView lineage).
- Semantic: success green `#10b981`, danger red `#ef4444`, warn amber `#f59e0b`.
- Neutral text: `#e6e8eb` on dark; `#1b2027` on light.

## Typography
- Sans display + body: Inter (or Inter UI).
- Mono for all numerics, prices, IDs: JetBrains Mono with `font-variant-numeric: tabular-nums`.
- Scale: 11/12/13 px for table cells; 14 for body; 16 for section heads; 20+ for hero numbers.
- Weights: 400 body, 500 emphasis, 600 numerics.

## Layout archetype
- Default: dense 3-pane on desktop — left rail (watchlist 240–320 px), center (chart / detail 1fr), right rail (order entry / depth 280–360 px).
- Top bar: account context + global search; height 44–48 px.
- Bottom strip optional: portfolio summary or news ticker.
- Panels share thin borders (`#1b2027` on dark) and 6 px corner radius.

## Key UX patterns
- Order book row layout (`refs/bloomberg-orderbook.png`): bid/ask split, depth-bar background, hover highlight, monospace prices right-aligned.
- Watchlist density (`refs/tradingview-watchlist.png`): sticky header, sortable cols, sparkline column, color-coded delta.
- Candlestick legend (`refs/tradingview-chart.png`): O/H/L/C in mono, color delta, indicator stack with toggleable visibility.
- Ticker formatting (`refs/robinhood-ticker.png`): symbol + name on stacked rows; price right-aligned with mono; delta with semantic color and `+`/`-` sign.
- Order panel (`refs/thinkorswim-orderpad.png`): segmented buy/sell, market/limit toggle, qty stepper, est-cost line, confirm with explicit summary.
- Empty/skeleton (`refs/kite-skeleton.png`): grey row shimmers — never show 0.00 placeholders that look like real prices.
- Numerics never use proportional fonts. Negative numbers never lose their sign through CSS truncation.

## Anti-patterns
- Royal blue `#3b82f6` as primary — reads SaaS, not finance. Use cyan/teal lineage.
- Proportional digits in price columns — eyes can't compare across rows.
- Decorative gradients on price-bearing surfaces — masks semantic colors.
- Modal-only order entry — pros need persistent side panel.
- Centered prices in tables — always right-align.
- Light theme as the only option — pro users default to dark.

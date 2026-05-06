# E-commerce

## Reference apps
| Name | URL | Why included |
| ---- | --- | ------------ |
| Apple | https://apple.com | Premium product storytelling, quiet typography. |
| Allbirds | https://allbirds.com | Modern DTC; warm neutrals; clear PDP rhythm. |
| Shopify Dawn (sample) | https://dawn-theme.myshopify.com | Reference storefront layout. |

## Palette
- Base: white `#ffffff` with off-white `#f7f5f1` for surface alternation.
- Accent: brand-driven; default to charcoal `#1d1d1f` (Apple-like).
- Semantic: success `#15803d`, danger `#b91c1c`, warn `#a16207`.
- Reserve color for badges (sale, new, low stock); never saturate the page.

## Typography
- Display: large-and-light for hero (28–48 px, 400–500 weight).
- Body: 14–16 px, generous line-height (1.6).
- Use serif accent only when brand calls for it; default sans.
- Numerics for prices: tabular sans; do not use mono.

## Layout archetype
- Sticky slim header with logo, nav, search, cart count.
- Hero section + 12-col responsive grid below.
- PLP: 3-up grid desktop, 2-up tablet, 1-up mobile; lazy-load images.
- PDP: image gallery left, info column right with price + variant pickers + add-to-cart sticky on mobile.
- Cart drawer (right slide-over) preferred over full cart page.

## Key UX patterns
- Product card (`refs/allbirds-card.png`): image-first, title beneath, price + delta, swatch row.
- Filter rail (`refs/dawn-filter.png`): facets with counts; sticky on desktop; sheet on mobile.
- Sticky add-to-cart (`refs/allbirds-pdp-mobile.png`): bottom sheet on mobile with price + CTA.
- Cart drawer (`refs/dawn-cart-drawer.png`): line items, subtotal, primary CTA at bottom.
- Image hover variant swap (`refs/apple-card.png`): on color change, swap hero image.

## Anti-patterns
- Discount stickers on every card — desensitizes the user; reserve for true sale.
- Cluttered hero with 4+ CTAs.
- Tiny mobile add-to-cart that scrolls away.
- Carousels without pause control.

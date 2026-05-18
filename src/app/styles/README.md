## Styling Source Of Truth

`src/app/globals.css` is the only stylesheet currently imported by the app (`src/app/layout.tsx`).

### Edit zones in `globals.css`

- `[NV-BROWSE-HERO]`: browse hero frame sizing and spacing.
- `[NV-PROFILE-FOLDER]`: profile/folder desktop layout values.
- `[NV-MOBILE-ALL-PAGES]`: canonical mobile system for landing, auth, browse, detail, home, profile/folder, books, and support.
- `[NV-MOBILE-CANONICAL]`: older mobile pass kept for compatibility while cleanup continues.

### Guardrails for future changes

1. Update existing selectors in these anchor sections first.
2. Avoid adding new emergency override blocks at the end of the file.
3. Keep cross-page mobile sizing changes inside `[NV-MOBILE-ALL-PAGES]` so phone/tablet behavior stays in one canonical place.

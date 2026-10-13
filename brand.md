# Brand — SkillBounty

Paid micro-projects where AI recommends suitable work to early-career talent and Solana records escrow and payment.

_Generated on 2026-10-08. Palette selected by the user; typography selected by the user._

## Palette — Ocean Terminal

**Vibe:** analytical cyan · data-forward · sharp
**Category:** AI / tech
**Mood:** technical + serious

### Seeds

| Role         | Dark OKLCH              | Light OKLCH            |
| ------------ | ----------------------- | ---------------------- |
| bg-base      | `oklch(0.13 0.02 230)`  | `oklch(0.98 0.01 230)` |
| bg-elevated  | `oklch(0.18 0.025 230)` | `oklch(1 0 0)`         |
| primary      | `oklch(0.74 0.16 220)`  | `oklch(0.48 0.14 220)` |
| primary-soft | `oklch(0.85 0.11 220)`  | `oklch(0.70 0.10 220)` |
| fg-base      | `oklch(0.96 0.01 230)`  | `oklch(0.18 0.02 230)` |

### Applied tokens

Tokens are in `app/globals.css`; the original template stylesheet is backed up at `app/globals.css.bak`.

| Token                              | Light                                                                                 | Dark                                                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| background / foreground            | `oklch(0.98 0.01 230)` / `oklch(0.18 0.02 230)`                                       | `oklch(0.13 0.02 230)` / `oklch(0.96 0.01 230)`                                       |
| card / card-foreground             | `oklch(1 0 0)` / `oklch(0.18 0.02 230)`                                               | `oklch(0.18 0.025 230)` / `oklch(0.96 0.01 230)`                                      |
| primary / primary-foreground       | `oklch(0.48 0.14 220)` / `oklch(0.98 0 0)`                                            | `oklch(0.74 0.16 220)` / `oklch(0.10 0.01 230)`                                       |
| secondary / foreground             | `oklch(0.94 0.015 230)` / `oklch(0.18 0.02 230)`                                      | `oklch(0.22 0.035 230)` / `oklch(0.96 0.01 230)`                                      |
| muted / muted-foreground           | `oklch(0.95 0.012 230)` / `oklch(0.42 0.025 230)`                                     | `oklch(0.20 0.025 230)` / `oklch(0.68 0.025 230)`                                     |
| accent / accent-foreground         | `oklch(0.93 0.025 220)` / `oklch(0.18 0.02 230)`                                      | `oklch(0.24 0.04 220)` / `oklch(0.96 0.01 230)`                                       |
| border / border-low / input / ring | `oklch(0.82 0.018 230)` / `oklch(0.82 0.015 230)` / `oklch(0.82 0.018 230)` / primary | `oklch(0.33 0.025 230)` / `oklch(0.33 0.025 230)` / `oklch(0.33 0.025 230)` / primary |

Text, primary button, focus ring, and divider pairs were checked against WCAG contrast thresholds: body text 17.75:1 (light) / 17.92:1 (dark), muted text 7.95:1 / 7.02:1, primary button 5.51:1 / 9.61:1, focus ring 5.52:1 / 9.38:1, and borders 1.64:1 / 1.65:1. Recheck after changing these tokens.

## Typography — Geist Sans + Geist Mono

- **Display and body:** Geist Sans
- **Mono (amounts, scores, addresses):** Geist Mono
- Loaded locally at build time through `next/font/google` in `app/layout.tsx`.

Use one clear page title, compact data labels, and `font-mono tabular-nums` for SOL amounts and match scores.

## Gradients

Not used. The technical, serious direction uses surface elevation and restrained cyan accents.

## Tone and voice

Use direct, specific, factual language. Prefer verbs and concrete numbers. Describe recommendation evidence and payment status plainly.

Avoid hype, overpromising, emojis, and claims that a score makes a hiring decision.

> AI suggests a match. The employer decides. The wallet authorizes payment.

## Usage

- Use CSS theme tokens rather than hardcoded colors in components.
- Keep spacing on a 4 px rhythm and verify both light and dark themes.
- Treat match scores as explainable recommendations, never an automatic acceptance or rejection.
- Keep personal information, briefs, and deliverables off-chain; only store hashes and transaction state.
- Use Devnet labels and `font-mono tabular-nums` for every displayed SOL amount.

---

_Last updated: 2026-10-08 · Ocean Terminal · Geist Sans + Geist Mono · no gradients._

# PON Calculator — FTTH & PON Tools

Standalone web calculator for practical FTTH splitter planning. Independent implementation; not affiliated with MUTANPRO.

## Current features
- Splitter Smart: FBT Drop/Pass ratios (1/99, 5/95, 10/90, 15/85, 20/80)
- PLC splitter selection (1:2, 1:4, 1:8, 1:16, 1:32)
- Input optical power and live estimated Drop/Pass outputs
- Automatic FBT ratio recommendation targeting an estimated ONT Rx of -18 to -22 dBm
- Simple OLT → FBT → PLC → ONT topology illustration
- Practical ONT Rx reference categories
- Light/dark theme and browser print-to-PDF

## Intentionally deferred
Fiber length, drop cable, splice, connector, detailed link budget, database, authentication, and editable topology are not included in this stage.

## Calculation assumptions
- FBT ideal branch loss: `-10 × log10(split percentage / 100)`.
- FBT excess loss defaults: 0.50 dB on Drop and 0.11 dB on Pass, for illustrative planning only.
- PLC typical insertion-loss presets: 1:2 = 3.7 dB; 1:4 = 7.4 dB; 1:8 = 10.7 dB; 1:16 = 14.0 dB; 1:32 = 17.3 dB.
- Estimated branch Rx = input power − FBT Drop loss − PLC insertion loss.
- Estimated Pass power = input power − FBT Pass loss.

These are default estimates, not guaranteed component specifications. Replace them with the actual manufacturer's datasheet values and verify installed networks with an optical power meter. ONT thresholds vary by optical class and device model.

## Requirements
- Node.js 20.9+
- npm 10+

## Run
```bash
npm install
npm run build
npm run start -- --port 3001
```


## GitHub Pages deployment

This repository exports a static Next.js site to `out/` using `basePath: '/PON'`.
GitHub Pages must be configured to use **GitHub Actions** as the deployment source.
The workflow in `.github/workflows/deploy.yml` builds the site and publishes `out/`.

- Main calculator: `/PON/`
- Network tools: `/PON/tools/`

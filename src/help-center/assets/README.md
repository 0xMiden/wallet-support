# Bread UI assets

The support redesign uses artwork and font binaries from `0xMiden/wallet` main
`f4879e099b41f6b5b06b6933dbfdd61c20946ddf`.

- `bread-logo.svg`: unchanged `public/misc/brand/new-bread.svg`.
- `bread-wordmark.svg`: unchanged `public/misc/brand/bread-text.svg`.
- `fonts/inter-latin-var.woff2`: wallet `fonts/Inter/webfonts/Inter-latin.woff2`,
  weight axis 400–800 and optical size axis 14–32.
- `fonts/nunito-latin-var.woff2`: wallet `fonts/Nunito/webfonts/Nunito-latin.woff2`,
  weight axis 400–800.
- `wallet-icons/`: geometry from `src/app/icons/v2`. For the download, key and
  settings SVGs, the root fill is `currentColor` instead of `none` so the paths
  render when used as CSS masks; the wallet's icon renderer supplies that fill.

Inter and Nunito are distributed under the SIL Open Font License 1.1. Their
licenses are included in the fonts directory. Assets load from the support
bundle; fonts have no third-party runtime dependency.

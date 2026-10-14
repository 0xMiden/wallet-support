# Bread Wallet support design

## Direction

Crisp and left-aligned, following the current wallet design system. A practical help surface with a prominent search, direct links to common tasks, compact topic rows, a quiet persistent navigation column, and a readable article column. No decorative product mockups or unsupported release claims.

## Colors

Copy the wallet's light theme semantic roles exactly: page #FFFFFF, fill #F3F0EC, fill-pressed #E9E5E0, ink #3F3F3F, muted #6B6B6B, accent #E77537, accent-tint #FDEEE5, accent-tint-ink #A84A18. Hairlines use ink at 10%. Primary orange buttons use 19px/800 white labels; smaller text actions use accent-tint-ink.

Topic glyphs use the current light-mode card palette: slate #777386, blue #607C92, green #778C72, purple #847595. These are small accents, with ink headings on white, rather than full decorative panels.

## Typography

Self-host the exact wallet Latin variable fonts. Nunito for headings, row titles and action labels at 700/800; Inter for article prose, descriptions, inputs and captions at 400/600. No 900 display weight. Body 16px, 1.65 line-height for long articles, maximum 68ch. Headings use a restrained hierarchy with normal sentence case and modest tracking.

## Components and layout

Authentic wallet SVG brand assets. Pill buttons and search; 16px contained surfaces; hairline row dividers. A 76rem home frame, shared gutter, asymmetric hero with task shortcuts beside the search, compact two-column topic directory, and a neutral network readiness notice. Articles retain their existing IDs, platform switch, image alignment, table of contents, copy-link and previous/next navigation.

Mobile collapses the hero and directory to one column. The article navigation opens in the existing accessible drawer. Header, content, and footer share a consistent brand treatment.

## Motion and states

Short color and surface transitions; visible focus on controls and links. Reduced motion removes travel. No decorative entrance animations, blur effects, or animated numbers.

## Source and authorization

Wallet main f4879e099b41f6b5b06b6933dbfdd61c20946ddf: design-system.md, main.css, canonical Button, wallet fonts and public/misc/brand assets. Brian requested a major UI update and matching Bread Wallet colors/fonts. This direction supersedes older support presentation tokens in this private local branch; publishing remains separately permissioned.

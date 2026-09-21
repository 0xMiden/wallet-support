# Wallet animation source

Copied from `0xMiden/wallet` PR [#1054](https://github.com/0xMiden/wallet/pull/1054), commit `02337f752720e9929c6e9afcd4945f2fd296a8d4`, the latest stack tip inspected for this follow-up.

The production modules from `src/lib/animation` are preserved unchanged. They run on the wallet’s `framer-motion` 12.35.2 dependency. The MIT license is included here.

`src/components/ui/animate/highlight.tsx` comes from the same commit; only its two repository import aliases are adapted. Its Animate UI license notice is retained in the file. The support header composes Highlight and `useTabBarMotion` like the wallet BottomNav, with a flat grey fill.

`src/lib/animation-css.ts` adapts these same tokens for the CSS animations used by Radix/shadcn. Sheet timings use the wallet’s analytic spring curves directly; press/pop curves use its spring solver. Reduced motion is enforced by the wallet hooks and the site-wide CSS media query.

Tab content switches immediately, following wallet TabLayout. The shared header remains mounted; page entrances do not replay on navigation.

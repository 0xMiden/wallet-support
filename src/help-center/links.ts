/**
 * Every destination outside the Help Center, in one place.
 *
 * The support URL was previously a constant inside the page component, which
 * meant the home page had to declare its own copy of it; two constants naming
 * one intake is one rotation away from half the site pointing at a dead form.
 *
 * The store links are the same URLs the reviewed articles link to, verbatim.
 * A second, tidier version of an approved link is still a second answer.
 */

/** Approved destination for the support intake (content proposal §3A). */
export const CONTACT_SUPPORT_URL =
  'https://miden-feedback-v2.miden-feedback-relay.workers.dev/';

export interface HelpCenterDownload {
  readonly id: string;
  readonly label: string;
  readonly href: string;
}

export const helpCenterDownloads: readonly HelpCenterDownload[] = [
  {
    id: 'ios',
    label: 'iOS — App Store',
    href: 'https://apps.apple.com/ch/app/bread-wallet-by-miden/id6789341854?l=en-GB'
  },
  {
    id: 'android',
    label: 'Android — Google Play',
    href: 'https://play.google.com/store/apps/details?id=com.miden.wallet'
  },
  {
    id: 'extension',
    label: 'Chrome extension',
    href: 'https://chromewebstore.google.com/detail/miden-wallet/ablmompanofnodfdkgchkpmphailefpb?pli=1'
  }
] as const;

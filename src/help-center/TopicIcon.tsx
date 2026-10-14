import type { CSSProperties } from 'react';
import wallet from './assets/wallet-icons/wallet.svg';
import privacy from './assets/wallet-icons/eye-off.svg';
import guardian from './assets/wallet-icons/key.svg';
import crossChain from './assets/wallet-icons/cross-chain.svg';
import settings from './assets/wallet-icons/settings.svg';
import download from './assets/wallet-icons/download.svg';

const icons: Record<string, string> = {
  'getting-started': download, 'manage-wallet': wallet, privacy, guardian,
  troubleshooting: settings, 'cross-chain': crossChain, earning: wallet
};

export function TopicIcon({ categoryId }: { categoryId: string }) {
  return <span className="help-topic-icon" aria-hidden="true" style={{ '--topic-icon': `url("${icons[categoryId] ?? wallet}")` } as CSSProperties} />;
}

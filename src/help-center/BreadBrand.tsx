import wordmark from './assets/bread-wordmark.svg';
import logo from './assets/bread-logo.svg';

/** Unmodified artwork from the current Bread Wallet bundle. */
export function BreadBrand() {
  return <span className="bread-brand-art" aria-hidden="true"><img className="bread-brand-mark" src={logo} alt="" /><img className="bread-brand-word" src={wordmark} alt="" /></span>;
}

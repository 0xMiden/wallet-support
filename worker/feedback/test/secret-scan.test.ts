import { describe, expect, it } from 'vitest';
import { detectMnemonic, scanForSecrets } from '../src/lib/secret-scan';

const PHRASE = 'abandon ability able about above absent absorb abstract absurd abuse access accident';

describe('recovery phrase detection', () => {
  it('finds a phrase on its own', () => {
    expect(scanForSecrets(PHRASE).map((h) => h.kind)).toEqual(['mnemonic']);
  });

  it('finds a phrase inside a sentence, where the words around it join the same run', () => {
    expect(scanForSecrets(`Is this right? ${PHRASE}`).map((h) => h.kind)).toEqual(['mnemonic']);
    expect(scanForSecrets(`My words are ${PHRASE} what now`).map((h) => h.kind)).toEqual(['mnemonic']);
  });

  it('still counts a phrase with one typo', () => {
    expect(scanForSecrets(`help with ${PHRASE.replace('absurd', 'absurb')}`).map((h) => h.kind)).toEqual(['mnemonic']);
  });

  it('leaves an ordinary long question alone', () => {
    const question = 'where can find the status of the bridge transfer that started today from ethereum into bread wallet';
    expect(scanForSecrets(question)).toEqual([]);
  });

  it('leaves list-style reviews that repeat a word alone', () => {
    // Commas do not break a run, so these used to reach 11 of 12 BIP-39 words.
    expect(scanForSecrets('Very good, very simple, very clean, very useful, very safe, very private, very quick, very smooth.')).toEqual([]);
    expect(scanForSecrets('please help please answer please fix please update please reply please call please explain')).toEqual([]);
  });

  it('still catches an embedded phrase that repeats one word', () => {
    const repeated = PHRASE.replace('access', 'abandon');
    expect(scanForSecrets(`Is this right? ${repeated} thanks`).map((h) => h.kind)).toEqual(['mnemonic']);
  });

  it('does not flag a long run on structure alone when no wordlist is given', () => {
    expect(detectMnemonic(`this right ${PHRASE}`)).toBeNull();
  });
});

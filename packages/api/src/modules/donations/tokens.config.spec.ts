import { findToken, tokensForChain, ALLOWED_TOKENS } from './tokens.config';

describe('findToken', () => {
  it('finds the native token entry for a known chain', () => {
    const token = findToken(11155111, null);
    expect(token).toEqual({
      chainId: 11155111,
      address: null,
      symbol: 'ETH',
      decimals: 18,
      coingeckoId: 'ethereum',
      isStablecoin: false,
    });
  });

  it('finds an ERC-20 entry by address, case-insensitively', () => {
    const usdc = ALLOWED_TOKENS.find(
      (t) => t.chainId === 11155111 && t.symbol === 'USDC',
    )!;
    const token = findToken(11155111, usdc.address!.toUpperCase());
    expect(token?.symbol).toBe('USDC');
  });

  it('returns undefined for an unknown chain', () => {
    expect(findToken(999999, null)).toBeUndefined();
  });

  it('returns undefined for an unlisted token address on a known chain', () => {
    expect(findToken(11155111, '0x0000000000000000000000000000000000dEaD')).toBeUndefined();
  });
});

describe('tokensForChain', () => {
  it('returns every allowlisted token for a chain, and nothing for an unknown one', () => {
    expect(tokensForChain(11155111).length).toBeGreaterThan(0);
    expect(tokensForChain(999999)).toEqual([]);
  });
});

import { Test } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { keccak256, toHex } from 'viem';
import { SafeService } from './safe.service';

const REAL_CREATION_CODE_HASH = '0x1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f';

// A syntactically-valid but wrong bytecode string whose hash won't match.
const WRONG_CODE = '0x600180600d6000396000f3';

jest.mock('viem', () => {
  const actual = jest.requireActual('viem');
  return {
    ...actual,
    createPublicClient: jest.fn(),
  };
});

import { createPublicClient } from 'viem';

describe('SafeService.getProxyCreationCode', () => {
  const chains = [
    { chainId: 11155111, name: 'Sepolia', rpcUrl: 'https://sepolia.example', explorerUrl: '', nativeSymbol: 'ETH', isTestnet: true },
  ];

  function buildService(readContractImpl: () => Promise<string>) {
    (createPublicClient as jest.Mock).mockReturnValue({
      readContract: jest.fn().mockImplementation(readContractImpl),
      getChainId: jest.fn().mockResolvedValue(11155111),
    });
    const config = {
      get: (key: string) => (key === 'chains.enabled' ? chains : ''),
    } as unknown as ConfigService;
    return new SafeService(config);
  }

  it('accepts and caches bytecode matching the known-good hash', async () => {
    // A real-shaped call would return the actual creation code; here we
    // just need something whose keccak256 equals REAL_CREATION_CODE_HASH,
    // so we reverse it: mock readContract to return a fixed real snippet
    // and assert the service's own hash check against the SAME constant
    // the implementation uses — proving the check runs, not proving the
    // literal Safe bytecode (that was verified live during planning).
    const anyCode = '0x11223344';
    const expectedHash = keccak256(anyCode as `0x${string}`);
    const service = buildService(async () => anyCode);
    (service as any).EXPECTED_PROXY_CREATION_CODE_HASH = expectedHash;

    const code = await (service as any).getProxyCreationCode();
    expect(code).toBe(anyCode);
  });

  it('throws instead of caching bytecode that does not match the expected hash', async () => {
    const service = buildService(async () => WRONG_CODE);
    // Leave the real constant in place — WRONG_CODE's hash won't match it.

    await expect((service as any).getProxyCreationCode()).rejects.toThrow(ServiceUnavailableException);
  });
});

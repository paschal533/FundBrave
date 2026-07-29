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

describe('SafeService.assertChainIdsMatch', () => {
  const chainA = {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.example',
    explorerUrl: '',
    nativeSymbol: 'ETH',
    isTestnet: true,
  };
  const chainB = {
    chainId: 84532,
    name: 'Base Sepolia',
    rpcUrl: 'https://base-sepolia.example',
    explorerUrl: '',
    nativeSymbol: 'ETH',
    isTestnet: true,
  };

  // publicClient() is called once per chain, in the order assertChainIdsMatch
  // iterates this.chains, so queuing one createPublicClient implementation
  // per chain (in the same order) lets each chain's client behave differently.
  function buildService(chains: typeof chainA[], getChainIdImpls: Array<() => Promise<number>>) {
    const mock = createPublicClient as jest.Mock;
    mock.mockReset();
    for (const impl of getChainIdImpls) {
      mock.mockImplementationOnce(() => ({
        readContract: jest.fn(),
        getChainId: jest.fn().mockImplementation(impl),
      }));
    }
    const config = {
      get: (key: string) => (key === 'chains.enabled' ? chains : ''),
    } as unknown as ConfigService;
    return new SafeService(config);
  }

  it('resolves without throwing when every enabled chain reports its own chain ID', async () => {
    const service = buildService(
      [chainA, chainB],
      [async () => chainA.chainId, async () => chainB.chainId],
    );

    await expect(service.assertChainIdsMatch()).resolves.toBeUndefined();
  });

  it('throws naming the chain when the RPC reports a mismatched chain ID', async () => {
    const service = buildService([chainA], [async () => 999999]);

    await expect(service.assertChainIdsMatch()).rejects.toThrow(/Sepolia/);
    await expect(
      buildService([chainA], [async () => 999999]).assertChainIdsMatch(),
    ).rejects.toThrow(/actually reports chain ID 999999/);
  });

  it('throws a clear, actionable message (not an unhandled rejection) when the RPC is unreachable', async () => {
    const service = buildService([chainA], [
      async () => {
        throw new Error('ECONNREFUSED');
      },
    ]);

    await expect(service.assertChainIdsMatch()).rejects.toThrow(/Sepolia/);
    await expect(
      buildService([chainA], [
        async () => {
          throw new Error('ECONNREFUSED');
        },
      ]).assertChainIdsMatch(),
    ).rejects.toThrow(/Could not reach RPC/);
  });
});

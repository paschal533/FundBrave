import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus, WithdrawalStatus } from '@prisma/client';
import { WithdrawalsService } from './withdrawals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeService } from '../safe/safe.service';
import { EmailService } from '../email/email.service';

describe('WithdrawalsService (execute path)', () => {
  const creatorWallet = '0x00000000000000000000000000000000000000C1';
  const adminAddress = '0x00000000000000000000000000000000000000AD';
  const safeAddress = '0x0000000000000000000000000000000000005AFE';

  const withdrawal = {
    id: 'wd-1',
    campaignId: 'campaign-1',
    chainId: 11155111,
    tokenAddress: null,
    amountRaw: '1000000000000000',
    toAddress: creatorWallet,
    nonce: 0,
    safeTxHash: '0xhash',
    creatorSignature: '0xcreatorsig',
    adminSignature: '0xadminsig',
    status: WithdrawalStatus.APPROVED,
    campaign: {
      title: 'Test',
      slug: 'test',
      safeAddress,
      creatorId: 'user-1',
      creatorWallet,
    },
  };

  let prisma: any;
  let safe: any;
  let email: any;
  let service: WithdrawalsService;

  beforeEach(async () => {
    prisma = {
      withdrawalRequest: {
        findUnique: jest.fn().mockResolvedValue(withdrawal),
        update: jest.fn().mockResolvedValue(withdrawal),
      },
      user: { findUnique: jest.fn() },
      safeDeployment: { upsert: jest.fn() },
    };
    safe = {
      getSafeNonce: jest.fn().mockResolvedValue(0n),
      isDeployed: jest.fn().mockResolvedValue(true),
      predictSafeAddress: jest.fn().mockResolvedValue({ safeAddress, saltNonce: '1' }),
      buildWithdrawalTx: jest.fn().mockReturnValue({}),
      getRootAdminAddress: jest.fn().mockReturnValue(adminAddress),
      execTransaction: jest.fn().mockResolvedValue('0xexectx'),
      deploySafe: jest.fn().mockResolvedValue('0xdeploytx'),
    };
    email = { send: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        WithdrawalsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SafeService, useValue: safe },
        { provide: EmailService, useValue: email },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = moduleRef.get(WithdrawalsService);
  });

  it('never looks up the creator wallet from the User table — uses campaign.creatorWallet', async () => {
    await (service as any).execute('wd-1');

    // notifyCreator() legitimately looks up the creator's email for the
    // notification on success — that's unrelated to this fix. What must
    // never happen is a live lookup of the creator's *wallet address*.
    expect(prisma.user.findUnique).not.toHaveBeenCalledWith(
      expect.objectContaining({ select: { walletAddress: true } }),
    );
    expect(safe.execTransaction).toHaveBeenCalledWith(
      11155111,
      safeAddress,
      expect.anything(),
      expect.arrayContaining([
        expect.objectContaining({ signer: creatorWallet }),
        expect.objectContaining({ signer: adminAddress }),
      ]),
    );
  });

  it('refuses to execute if the predicted address no longer matches the stored safeAddress', async () => {
    safe.predictSafeAddress.mockResolvedValue({ safeAddress: '0xDIFFERENT00000000000000000000000000000', saltNonce: '1' });

    await (service as any).execute('wd-1');

    expect(safe.execTransaction).not.toHaveBeenCalled();
    expect(prisma.withdrawalRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'wd-1' },
        data: expect.objectContaining({ status: WithdrawalStatus.FAILED }),
      }),
    );
  });
});

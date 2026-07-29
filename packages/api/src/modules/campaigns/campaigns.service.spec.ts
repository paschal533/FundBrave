import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SafeService } from '../safe/safe.service';
import { MoralisStreamsService } from '../donations/moralis-streams.service';

describe('CampaignsService.publish', () => {
  const creatorWallet = '0x00000000000000000000000000000000000000C1';
  const predictedSafe = { safeAddress: '0x0000000000000000000000000000000000005AFE', saltNonce: '42' };

  const mockCampaign = {
    id: 'campaign-1',
    status: CampaignStatus.DRAFT,
    media: [{ id: 'm1' }],
    creatorId: 'user-1',
    goalUsd: { toString: () => '1000' },
    raisedUsd: { toString: () => '0' },
  };

  const user = { id: 'user-1', walletAddress: creatorWallet } as any;

  let prisma: { campaign: { findUnique: jest.Mock; update: jest.Mock } };
  let safe: { predictSafeAddress: jest.Mock };
  let streams: { watchAddress: jest.Mock };
  let service: CampaignsService;

  beforeEach(async () => {
    prisma = {
      campaign: {
        findUnique: jest.fn().mockResolvedValue(mockCampaign),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...mockCampaign,
          ...data,
          media: mockCampaign.media,
          creator: null,
        })),
      },
    };
    safe = { predictSafeAddress: jest.fn().mockResolvedValue(predictedSafe) };
    streams = { watchAddress: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SafeService, useValue: safe },
        { provide: MoralisStreamsService, useValue: streams },
      ],
    }).compile();

    service = moduleRef.get(CampaignsService);
  });

  it('persists creatorWallet alongside safeAddress/safeSalt on publish', async () => {
    await service.publish(user, 'campaign-1');

    expect(safe.predictSafeAddress).toHaveBeenCalledWith(creatorWallet, 'campaign-1');
    expect(prisma.campaign.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'campaign-1' },
        data: expect.objectContaining({
          status: CampaignStatus.ACTIVE,
          safeAddress: predictedSafe.safeAddress,
          safeSalt: predictedSafe.saltNonce,
          creatorWallet: creatorWallet,
        }),
      }),
    );
  });

  it('rejects publishing with an invalid wallet address', async () => {
    const badUser = { id: 'user-1', walletAddress: 'not-an-address' } as any;
    await expect(service.publish(badUser, 'campaign-1')).rejects.toThrow(BadRequestException);
    expect(prisma.campaign.update).not.toHaveBeenCalled();
  });
});

import { Controller, Get, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { PrivyAuthGuard, RegisteredGuard } from '../auth/privy-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { WalletService } from './wallet.service';

@Controller('wallet')
@UseGuards(PrivyAuthGuard, RegisteredGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('balances')
  @Throttle({ default: { limit: 6, ttl: 60_000 } })
  balances(@CurrentUser() user: User) {
    return this.wallet.balances(user);
  }
}

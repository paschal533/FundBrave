import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SafeModule } from '../safe/safe.module';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';

@Module({
  imports: [AuthModule, SafeModule],
  controllers: [WalletController],
  providers: [WalletService],
})
export class WalletModule {}

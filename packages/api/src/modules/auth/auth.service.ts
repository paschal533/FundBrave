import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PrivyService } from './privy.service';

export const NOT_WHITELISTED = 'NOT_WHITELISTED';

/**
 * privyDid prefix used ONLY by prisma/seed-mvp.ts for its synthetic admin
 * placeholder row. Must stay in sync with that file — it's the sentinel
 * syncUser() checks before adopting a pre-existing email-keyed row, so a
 * real user row can never be silently reassigned to a different login.
 */
const SEED_PRIVY_DID_PREFIX = 'seed:';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly rootAdminEmail: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly privy: PrivyService,
    config: ConfigService,
  ) {
    this.rootAdminEmail = (config.get<string>('admin.rootAdminEmail') ?? '').toLowerCase();
  }

  /**
   * Called after Privy login. Verifies identity server-side against the
   * Privy API (never trusts client-supplied email/wallet), enforces the
   * whitelist, and creates/updates the local user row.
   */
  async syncUser(did: string): Promise<User> {
    const profile = await this.privy.getUser(did);

    if (!profile.email) {
      throw new ForbiddenException('An email login is required (email or Google)');
    }
    if (!profile.embeddedWalletAddress) {
      throw new ServiceUnavailableException(
        'Embedded wallet not provisioned yet — retry in a moment',
      );
    }

    const email = profile.email;
    const isRootAdmin = this.rootAdminEmail !== '' && email === this.rootAdminEmail;

    // Whitelist gate (root admin email bypasses and is auto-whitelisted)
    const entry = await this.prisma.whitelistEntry.findUnique({ where: { email } });
    if (!entry && !isRootAdmin) {
      throw new ForbiddenException({
        statusCode: 403,
        code: NOT_WHITELISTED,
        message: 'This email is not on the FundBrave access list yet.',
      });
    }

    // Two-step instead of a single upsert-by-privyDid: a user row can
    // already exist keyed by `email` (e.g. seed-mvp.ts's synthetic admin
    // row, privyDid `seed:admin:<email>`) before this DID's first real
    // sync. upsert-by-privyDid alone would then hit `create` and collide
    // with that row's unique `email` constraint (P2002).
    const existingByDid = await this.prisma.user.findUnique({ where: { privyDid: did } });
    let user: User;
    if (existingByDid) {
      user = await this.prisma.user.update({
        where: { privyDid: did },
        data: {
          email,
          walletAddress: profile.embeddedWalletAddress,
          ...(isRootAdmin ? { role: Role.ADMIN } : {}),
        },
      });
    } else {
      const existingByEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingByEmail && !existingByEmail.privyDid.startsWith(SEED_PRIVY_DID_PREFIX)) {
        // A real row already owns this email under a different privyDid.
        // Never silently reassign an existing account to a new login —
        // that's an account-takeover surface, not a seed-collision fix.
        this.logger.error(
          `Refusing to adopt user ${existingByEmail.id} (${email}): ` +
            `existing privyDid does not match this login and isn't a seed placeholder`,
        );
        throw new ConflictException(
          'An account already exists for this email under a different login. Contact support.',
        );
      }
      // Either brand new, or only a seed-mvp.ts placeholder holds this
      // email — safe to create/claim, mirroring how seed-mvp.ts already
      // handles the opposite ordering (real user first, seed run after,
      // its own upsert-by-email no-ops against the real row).
      user = await this.prisma.user.upsert({
        where: { email },
        create: {
          privyDid: did,
          email,
          walletAddress: profile.embeddedWalletAddress,
          role: isRootAdmin ? Role.ADMIN : Role.USER,
        },
        update: {
          privyDid: did,
          walletAddress: profile.embeddedWalletAddress,
          ...(isRootAdmin ? { role: Role.ADMIN } : {}),
        },
      });
    }

    // Mark invite consumed / self-heal root admin whitelist entry
    if (entry && !entry.usedAt) {
      await this.prisma.whitelistEntry.update({
        where: { email },
        data: { usedAt: new Date() },
      });
    } else if (!entry && isRootAdmin) {
      await this.prisma.whitelistEntry.create({
        data: { email, invitedBy: user.id, usedAt: new Date() },
      });
    }

    this.logger.log(`Synced user ${user.id} (${email})${isRootAdmin ? ' [root admin]' : ''}`);
    return user;
  }
}

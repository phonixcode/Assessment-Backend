import { randomInt } from 'crypto';
import { User, Wallet } from '../../models';
import { sequelize } from '../../config';
import { Transaction } from 'sequelize';

function generateWalletNumber(): string {
  return 'WN' + randomInt(1_000_000_000, 9_999_999_999).toString();
}

export interface CreateUserInput {
  username: string;
}

export interface CreateUserResult {
  user: { id: string; username: string };
  wallet: { id: string; walletNumber: string; balanceCents: number };
}

export async function createUser(input: CreateUserInput): Promise<{
  statusCode: number;
  body: CreateUserResult | { error: string };
}> {
  const username = input.username?.trim();
  if (!username || username.length === 0) {
    return { statusCode: 400, body: { error: 'username is required' } };
  }
  if (username.length > 64) {
    return { statusCode: 400, body: { error: 'username too long' } };
  }

  const existing = await User.findOne({ where: { username } });
  if (existing) {
    return { statusCode: 409, body: { error: `User already exists: ${username}` } };
  }

  const result = await sequelize.transaction(async (tx: Transaction) => {
    const user = await User.create({ username }, { transaction: tx });
    let walletNumber = generateWalletNumber();
    let attempts = 0;
    while (attempts < 5) {
      const exists = await Wallet.findOne({ where: { walletNumber }, transaction: tx });
      if (!exists) break;
      walletNumber = generateWalletNumber();
      attempts++;
    }
    const wallet = await Wallet.create(
      { userId: user.id, walletNumber, balanceCents: 0, currency: 'NGN' },
      { transaction: tx }
    );
    return {
      statusCode: 201,
      body: {
        user: { id: user.id, username: user.username },
        wallet: {
          id: wallet.id,
          walletNumber: wallet.walletNumber,
          balanceCents: Number(wallet.balanceCents),
        },
      },
    };
  });

  return result;
}

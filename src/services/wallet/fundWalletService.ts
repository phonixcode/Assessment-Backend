import { Transaction } from 'sequelize';
import { Wallet, Ledger } from '../../models';
import { sequelize } from '../../config';

export interface FundWalletInput {
  walletId: string;
  amountCents: number;
}

export interface FundWalletResult {
  walletId: string;
  balanceCents: number;
  creditedCents: number;
}

export async function fundWallet(input: FundWalletInput): Promise<{
  statusCode: number;
  body: FundWalletResult | { error: string };
}> {
  const { walletId, amountCents } = input;

  if (amountCents <= 0) {
    return { statusCode: 400, body: { error: 'amountCents must be positive' } };
  }

  const result = await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
    async (tx: Transaction) => {
      const wallet = await Wallet.findByPk(walletId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      if (!wallet) {
        return { statusCode: 404, body: { error: `Wallet not found: ${walletId}` } };
      }

      const currentBalance = Number(wallet.balanceCents);
      const newBalance = currentBalance + amountCents;
      await wallet.update({ balanceCents: newBalance }, { transaction: tx });

      await Ledger.create(
        {
          walletId: wallet.id,
          amountCents,
          type: 'CREDIT',
          referenceId: `fund-${walletId}-${Date.now()}`,
          referenceType: 'FUND',
          balanceAfterCents: newBalance,
        },
        { transaction: tx }
      );

      return {
        statusCode: 200,
        body: {
          walletId: wallet.id,
          balanceCents: newBalance,
          creditedCents: amountCents,
        },
      };
    }
  );

  return result;
}

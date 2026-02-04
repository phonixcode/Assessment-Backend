import { Transaction } from 'sequelize';
import { Wallet, Ledger, InterestRecord } from '../../models';
import { sequelize } from '../../config';
import { dailyInterestCents, dailyRateDecimalForDate } from './interestMath';

export interface AccrueInterestInput {
  walletId: string;
  balanceCentsAtEod: number;
  interestDate: Date;
}

export async function accrueDailyInterest(input: AccrueInterestInput): Promise<{
  interestCents: number;
  record?: InterestRecord;
}> {
  const { walletId, balanceCentsAtEod, interestDate } = input;
  const dateOnly = interestDate.toISOString().slice(0, 10);

  const interestCents = dailyInterestCents(balanceCentsAtEod, interestDate);
  if (interestCents <= 0) {
    return { interestCents: 0 };
  }

  const existing = await InterestRecord.findOne({
    where: { walletId, interestDate: dateOnly },
  });
  if (existing) {
    return { interestCents: existing.interestCents, record: existing };
  }

  const record = await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
    async (tx: Transaction) => {
      const wallet = await Wallet.findByPk(walletId, {
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      if (!wallet) throw new Error(`Wallet not found: ${walletId}`);

      const [rec] = await InterestRecord.findOrCreate({
        where: { walletId, interestDate: dateOnly },
        defaults: {
          walletId,
          interestDate: dateOnly,
          balanceCentsAtEod,
          interestCents,
          rateUsed: dailyRateDecimalForDate(interestDate).toFixed(6),
        },
        transaction: tx,
      });

      if (rec.interestCents !== interestCents) {
        await rec.update({ interestCents, balanceCentsAtEod }, { transaction: tx });
      }

      const newBalance = Number(wallet.balanceCents) + interestCents;
      await wallet.update({ balanceCents: newBalance }, { transaction: tx });
      await Ledger.create(
        {
          walletId,
          amountCents: interestCents,
          type: 'INTEREST',
          referenceId: `interest-${dateOnly}-${walletId}`,
          referenceType: 'INTEREST',
          balanceAfterCents: newBalance,
        },
        { transaction: tx }
      );

      return rec;
    }
  );

  return { interestCents, record };
}

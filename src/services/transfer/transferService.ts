import { Transaction } from 'sequelize';
import { Wallet, Ledger, TransactionLog } from '../../models';
import { sequelize } from '../../config';

export interface TransferInput {
  idempotencyKey: string;
  fromUserId: string;
  toUserId: string;
  amountCents: number;
}

export interface TransferResult {
  fromWalletId: string;
  toWalletId: string;
  amountCents: number;
  fromBalanceCents: number;
  toBalanceCents: number;
}

const PENDING = 'PENDING';
const COMPLETED = 'COMPLETED';
const FAILED = 'FAILED';

function isUniqueViolation(err: unknown): boolean {
  const e = err as { name?: string; parent?: { code?: string } };
  return e?.name === 'SequelizeUniqueConstraintError' || e?.parent?.code === '23505';
}

export async function executeTransfer(input: TransferInput): Promise<{
  statusCode: number;
  body: TransferResult | { error: string };
}> {
  const { idempotencyKey, fromUserId, toUserId, amountCents } = input;

  if (amountCents <= 0) {
    return { statusCode: 400, body: { error: 'amountCents must be positive' } };
  }
  if (fromUserId === toUserId) {
    return { statusCode: 400, body: { error: 'from and to cannot be the same' } };
  }

  let log: TransactionLog | null = await TransactionLog.findOne({
    where: { idempotencyKey },
  });
  if (log && (log.state === COMPLETED || log.state === FAILED)) {
    return {
      statusCode: log.responseStatusCode ?? 200,
      body: (log.responsePayload as TransferResult | { error: string }) ?? { error: 'Unknown' },
    };
  }
  if (log?.state === PENDING) {
    return { statusCode: 409, body: { error: 'Request with this idempotency key is in progress' } };
  }

  try {
    log = await TransactionLog.create({
      idempotencyKey,
      state: PENDING,
      amountCents,
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      log = await TransactionLog.findOne({ where: { idempotencyKey } });
      if (log?.state === COMPLETED || log?.state === FAILED) {
        return {
          statusCode: log.responseStatusCode ?? 200,
          body: (log.responsePayload as TransferResult | { error: string }) ?? { error: 'Unknown' },
        };
      }
      return { statusCode: 409, body: { error: 'Request with this idempotency key is in progress' } };
    }
    throw err;
  }

  const result = await sequelize.transaction(
    { isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ },
    async (tx: Transaction) => {
      const fromWallet = await Wallet.findOne({
        where: { userId: fromUserId },
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      const toWallet = await Wallet.findOne({
        where: { userId: toUserId },
        lock: tx.LOCK.UPDATE,
        transaction: tx,
      });
      if (!fromWallet) {
        return { statusCode: 404, body: { error: `Wallet not found for user: ${fromUserId}` } };
      }
      if (!toWallet) {
        return { statusCode: 404, body: { error: `Wallet not found for user: ${toUserId}` } };
      }
      const fromBalance = Number(fromWallet.balanceCents);
      if (fromBalance < amountCents) {
        return { statusCode: 402, body: { error: 'Insufficient balance' } };
      }

      const newFromBalance = fromBalance - amountCents;
      const newToBalance = Number(toWallet.balanceCents) + amountCents;

      await fromWallet.update({ balanceCents: newFromBalance }, { transaction: tx });
      await toWallet.update({ balanceCents: newToBalance }, { transaction: tx });

      const ref = `transfer-${idempotencyKey}`;
      await Ledger.create(
        {
          walletId: fromWallet.id,
          amountCents: -amountCents,
          type: 'TRANSFER_OUT',
          referenceId: ref,
          referenceType: 'TRANSFER',
          balanceAfterCents: newFromBalance,
        },
        { transaction: tx }
      );
      await Ledger.create(
        {
          walletId: toWallet.id,
          amountCents,
          type: 'TRANSFER_IN',
          referenceId: ref,
          referenceType: 'TRANSFER',
          balanceAfterCents: newToBalance,
        },
        { transaction: tx }
      );

      const successPayload: TransferResult = {
        fromWalletId: fromWallet.id,
        toWalletId: toWallet.id,
        amountCents,
        fromBalanceCents: newFromBalance,
        toBalanceCents: newToBalance,
      };

      await TransactionLog.update(
        {
          state: COMPLETED,
          fromWalletId: fromWallet.id,
          toWalletId: toWallet.id,
          responsePayload: successPayload as unknown as Record<string, unknown>,
          responseStatusCode: 200,
        },
        { where: { id: log!.id }, transaction: tx }
      );

      return { statusCode: 200, body: successPayload };
    }
  ).catch((err) => {
    const message = err?.message ?? 'Transfer failed';
    return { statusCode: 500, body: { error: message } };
  });

  if (result.statusCode !== 200) {
    await TransactionLog.update(
      {
        state: FAILED,
        errorMessage: typeof result.body === 'object' && 'error' in result.body ? result.body.error : String(result.body),
        responsePayload: result.body as Record<string, unknown>,
        responseStatusCode: result.statusCode,
      },
      { where: { id: log!.id } }
    );
  }

  return result;
}

import { Request, Response } from 'express';
import { executeTransfer } from '../services/transfer/transferService';

export async function postTransfer(req: Request, res: Response): Promise<void> {
  const idempotencyKey =
    (req.headers['idempotency-key'] as string)?.trim() ||
    (req.body?.idempotencyKey as string)?.trim();
  const fromUserId = req.body?.fromUserId;
  const toUserId = req.body?.toUserId;
  const amountCents = req.body?.amountCents;

  if (!idempotencyKey) {
    res.status(400).json({ error: 'idempotency-key header or body.idempotencyKey required' });
    return;
  }
  if (fromUserId == null || toUserId == null || amountCents == null) {
    res.status(400).json({ error: 'fromUserId, toUserId, and amountCents required' });
    return;
  }

  const numCents = Number(amountCents);
  if (!Number.isInteger(numCents)) {
    res.status(400).json({ error: 'amountCents must be an integer' });
    return;
  }

  const { statusCode, body } = await executeTransfer({
    idempotencyKey,
    fromUserId: String(fromUserId),
    toUserId: String(toUserId),
    amountCents: numCents,
  });
  res.status(statusCode).json(body);
}

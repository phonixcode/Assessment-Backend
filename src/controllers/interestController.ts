import { Request, Response } from 'express';
import { accrueDailyInterest } from '../services/interest/interestService';
import { InterestRecord } from '../models';

export async function getInterestRecords(req: Request, res: Response): Promise<void> {
  const walletId = req.query.walletId as string | undefined;
  const where = walletId ? { walletId } : {};
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const records = await InterestRecord.findAll({
    where,
    order: [['interestDate', 'DESC']],
    limit,
  });
  res.status(200).json({ records: records.map((r) => r.get({ plain: true })) });
}

export async function postInterestAccrue(req: Request, res: Response): Promise<void> {
  const walletId = req.body?.walletId;
  const balanceCentsAtEod = req.body?.balanceCentsAtEod;
  const interestDate = req.body?.interestDate;

  if (walletId == null || balanceCentsAtEod == null || interestDate == null) {
    res.status(400).json({ error: 'walletId, balanceCentsAtEod, and interestDate required' });
    return;
  }

  const date = new Date(interestDate);
  if (Number.isNaN(date.getTime())) {
    res.status(400).json({ error: 'interestDate must be a valid date' });
    return;
  }

  try {
    const result = await accrueDailyInterest({
      walletId: String(walletId),
      balanceCentsAtEod: Number(balanceCentsAtEod),
      interestDate: date,
    });
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Accrue failed';
    res.status(500).json({ error: message });
  }
}

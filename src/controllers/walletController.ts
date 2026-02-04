import { Request, Response } from 'express';
import { fundWallet } from '../services/wallet/fundWalletService';
import { Wallet, Ledger } from '../models';

export async function getWallet(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Wallet id required' });
    return;
  }
  const wallet = await Wallet.findByPk(id);
  if (!wallet) {
    res.status(404).json({ error: 'Wallet not found' });
    return;
  }
  res.status(200).json(wallet.get({ plain: true }));
}

export async function getWalletLedger(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'Wallet id required' });
    return;
  }
  const wallet = await Wallet.findByPk(id);
  if (!wallet) {
    res.status(404).json({ error: 'Wallet not found' });
    return;
  }
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const entries = await Ledger.findAll({
    where: { walletId: id },
    order: [['createdAt', 'DESC']],
    limit,
  });
  res.status(200).json({ walletId: id, entries: entries.map((e) => e.get({ plain: true })) });
}

export async function postFundWallet(req: Request, res: Response): Promise<void> {
  const walletId = req.params.id;
  const amountCents = req.body?.amountCents;

  if (!walletId) {
    res.status(400).json({ error: 'Wallet id required' });
    return;
  }
  if (amountCents == null) {
    res.status(400).json({ error: 'amountCents required' });
    return;
  }

  const numCents = Number(amountCents);
  if (!Number.isInteger(numCents)) {
    res.status(400).json({ error: 'amountCents must be an integer' });
    return;
  }

  const { statusCode, body } = await fundWallet({ walletId, amountCents: numCents });
  res.status(statusCode).json(body);
}

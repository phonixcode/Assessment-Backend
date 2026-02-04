import { Request, Response } from 'express';
import { createUser } from '../services/user/createUserService';
import { User, Wallet } from '../models';

export async function postUser(req: Request, res: Response): Promise<void> {
  const username = req.body?.username;

  const { statusCode, body } = await createUser({ username });
  res.status(statusCode).json(body);
}

export async function getUser(req: Request, res: Response): Promise<void> {
  const id = req.params.id;
  if (!id) {
    res.status(400).json({ error: 'User id required' });
    return;
  }
  const user = await User.findByPk(id, { include: [Wallet] });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const plain = user.get({ plain: true }) as { Wallet?: Record<string, unknown> } & Record<string, unknown>;
  const { Wallet: wallet, ...userFields } = plain;
  res.status(200).json({ user: userFields, wallet: wallet ?? null });
}

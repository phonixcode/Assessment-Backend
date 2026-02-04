import { executeTransfer } from '../src/services/transfer/transferService';
import { sequelize } from '../src/config';

jest.mock('../src/config', () => ({
  sequelize: {
    transaction: jest.fn((opts: unknown, fn: (tx: unknown) => Promise<unknown>) =>
      fn({ LOCK: { UPDATE: 'UPDATE' } })
    ),
  },
}));

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../src/models', () => ({
  Wallet: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findByPk: (...args: unknown[]) => jest.fn(),
  },
  Ledger: { create: jest.fn().mockResolvedValue(undefined) },
  TransactionLog: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

function makeWalletMock(id: string, balanceCents: number) {
  return {
    id,
    balanceCents,
    update: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUpdate.mockResolvedValue(undefined);
});

describe('executeTransfer validation', () => {
  it('returns 400 when amountCents is not positive', async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'log-uuid' });

    const r = await executeTransfer({
      idempotencyKey: 'key-1',
      fromUserId: 'u1',
      toUserId: 'u2',
      amountCents: 0,
    });
    expect(r.statusCode).toBe(400);
    expect(r.body).toMatchObject({ error: expect.any(String) });
  });

  it('returns 400 when from and to are the same', async () => {
    const r = await executeTransfer({
      idempotencyKey: 'key-same',
      fromUserId: 'u1',
      toUserId: 'u1',
      amountCents: 100,
    });
    expect(r.statusCode).toBe(400);
    expect(r.body).toMatchObject({ error: expect.any(String) });
  });
});

describe('executeTransfer idempotency', () => {
  it('returns cached response when idempotency key already completed', async () => {
    const cached = {
      fromWalletId: 'w1-id',
      toWalletId: 'w2-id',
      amountCents: 50,
      fromBalanceCents: 50,
      toBalanceCents: 150,
    };
    mockFindOne.mockResolvedValue({
      idempotencyKey: 'key-done',
      state: 'COMPLETED',
      responsePayload: cached,
      responseStatusCode: 200,
    });

    const r = await executeTransfer({
      idempotencyKey: 'key-done',
      fromUserId: 'u1',
      toUserId: 'u2',
      amountCents: 50,
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual(cached);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns cached error when idempotency key already failed', async () => {
    mockFindOne.mockResolvedValue({
      state: 'FAILED',
      responsePayload: { error: 'Insufficient balance' },
      responseStatusCode: 402,
    });

    const r = await executeTransfer({
      idempotencyKey: 'key-fail',
      fromUserId: 'u1',
      toUserId: 'u2',
      amountCents: 999,
    });
    expect(r.statusCode).toBe(402);
    expect(r.body).toMatchObject({ error: 'Insufficient balance' });
  });

  it('returns 409 when idempotency key is still PENDING', async () => {
    mockFindOne.mockResolvedValue({
      idempotencyKey: 'key-pending',
      state: 'PENDING',
    });

    const r = await executeTransfer({
      idempotencyKey: 'key-pending',
      fromUserId: 'u1',
      toUserId: 'u2',
      amountCents: 100,
    });
    expect(r.statusCode).toBe(409);
    expect(r.body).toMatchObject({ error: expect.stringContaining('in progress') });
  });

  it('on unique violation returns cached response if log completed', async () => {
    const cached = { fromWalletId: 'w1', toWalletId: 'w2', amountCents: 100, fromBalanceCents: 0, toBalanceCents: 100 };
    mockFindOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ state: 'COMPLETED', responsePayload: cached, responseStatusCode: 200 });
    mockCreate.mockRejectedValueOnce({ name: 'SequelizeUniqueConstraintError' });

    const r = await executeTransfer({
      idempotencyKey: 'key-dup',
      fromUserId: 'u1',
      toUserId: 'u2',
      amountCents: 100,
    });
    expect(r.statusCode).toBe(200);
    expect(r.body).toEqual(cached);
  });

  it('on unique violation returns 409 when existing log is PENDING', async () => {
    mockFindOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ state: 'PENDING' });
    mockCreate.mockRejectedValueOnce({ name: 'SequelizeUniqueConstraintError' });

    const r = await executeTransfer({
      idempotencyKey: 'key-dup-pending',
      fromUserId: 'u1',
      toUserId: 'u2',
      amountCents: 100,
    });
    expect(r.statusCode).toBe(409);
    expect(r.body).toMatchObject({ error: expect.stringContaining('in progress') });
  });

  it('rethrows when TransactionLog.create fails with non-unique error', async () => {
    mockFindOne.mockResolvedValue(null);
    const dbError = new Error('Connection refused');
    mockCreate.mockRejectedValueOnce(dbError);

    await expect(
      executeTransfer({
        idempotencyKey: 'key-create-fail',
        fromUserId: 'u1',
        toUserId: 'u2',
        amountCents: 100,
      })
    ).rejects.toThrow('Connection refused');
  });
});

describe('executeTransfer transaction path', () => {
  it('returns 200 and transfer result when wallets exist and have balance', async () => {
    const fromWallet = makeWalletMock('wallet-from-id', 10_000);
    const toWallet = makeWalletMock('wallet-to-id', 0);

    mockFindOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
      const w = (opts?.where ?? opts) as Record<string, unknown>;
      if (w && 'idempotencyKey' in w) return Promise.resolve(null);
      if (w && w.userId === 'user-from') return Promise.resolve(fromWallet);
      if (w && w.userId === 'user-to') return Promise.resolve(toWallet);
      return Promise.resolve(null);
    });
    mockCreate.mockResolvedValue({ id: 'log-1' });

    const r = await executeTransfer({
      idempotencyKey: 'key-success',
      fromUserId: 'user-from',
      toUserId: 'user-to',
      amountCents: 1000,
    });

    expect(r.statusCode).toBe(200);
    expect(r.body).toMatchObject({
      fromWalletId: 'wallet-from-id',
      toWalletId: 'wallet-to-id',
      amountCents: 1000,
      fromBalanceCents: 9000,
      toBalanceCents: 1000,
    });
    expect(fromWallet.update).toHaveBeenCalledWith(
      { balanceCents: 9000 },
      expect.objectContaining({ transaction: expect.anything() })
    );
    expect(toWallet.update).toHaveBeenCalledWith(
      { balanceCents: 1000 },
      expect.objectContaining({ transaction: expect.anything() })
    );
    expect((sequelize as unknown as { transaction: jest.Mock }).transaction).toHaveBeenCalled();
  });

  it('returns 404 when from user wallet not found', async () => {
    mockFindOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
      const w = (opts?.where ?? opts) as Record<string, unknown>;
      if (w && 'idempotencyKey' in w) return Promise.resolve(null);
      if (w && w.userId === 'user-from') return Promise.resolve(null);
      if (w && w.userId === 'user-to') return Promise.resolve(makeWalletMock('w2', 0));
      return Promise.resolve(null);
    });
    mockCreate.mockResolvedValue({ id: 'log-1' });

    const r = await executeTransfer({
      idempotencyKey: 'key-404-from',
      fromUserId: 'user-from',
      toUserId: 'user-to',
      amountCents: 100,
    });

    expect(r.statusCode).toBe(404);
    expect(r.body).toMatchObject({ error: expect.stringContaining('user-from') });
  });

  it('returns 404 when to user wallet not found', async () => {
    mockFindOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
      const w = (opts?.where ?? opts) as Record<string, unknown>;
      if (w && 'idempotencyKey' in w) return Promise.resolve(null);
      if (w && w.userId === 'user-from') return Promise.resolve(makeWalletMock('w1', 10_000));
      if (w && w.userId === 'user-to') return Promise.resolve(null);
      return Promise.resolve(null);
    });
    mockCreate.mockResolvedValue({ id: 'log-1' });

    const r = await executeTransfer({
      idempotencyKey: 'key-404-to',
      fromUserId: 'user-from',
      toUserId: 'user-to',
      amountCents: 100,
    });

    expect(r.statusCode).toBe(404);
    expect(r.body).toMatchObject({ error: expect.stringContaining('user-to') });
  });

  it('returns 402 when insufficient balance', async () => {
    const fromWallet = makeWalletMock('w1', 50);
    const toWallet = makeWalletMock('w2', 0);

    mockFindOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
      const w = (opts?.where ?? opts) as Record<string, unknown>;
      if (w && 'idempotencyKey' in w) return Promise.resolve(null);
      if (w && w.userId === 'user-from') return Promise.resolve(fromWallet);
      if (w && w.userId === 'user-to') return Promise.resolve(toWallet);
      return Promise.resolve(null);
    });
    mockCreate.mockResolvedValue({ id: 'log-1' });

    const r = await executeTransfer({
      idempotencyKey: 'key-402',
      fromUserId: 'user-from',
      toUserId: 'user-to',
      amountCents: 1000,
    });

    expect(r.statusCode).toBe(402);
    expect(r.body).toMatchObject({ error: 'Insufficient balance' });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'FAILED',
        responseStatusCode: 402,
      }),
      expect.any(Object)
    );
  });

  it('returns 500 and updates log to FAILED when transaction throws', async () => {
    mockFindOne.mockImplementation((opts: { where?: Record<string, unknown> }) => {
      const w = (opts?.where ?? opts) as Record<string, unknown>;
      if (w && 'idempotencyKey' in w) return Promise.resolve(null);
      return Promise.resolve(null);
    });
    mockCreate.mockResolvedValue({ id: 'log-1' });
    (sequelize as unknown as { transaction: jest.Mock }).transaction.mockRejectedValueOnce(new Error('DB error'));

    const r = await executeTransfer({
      idempotencyKey: 'key-500',
      fromUserId: 'user-from',
      toUserId: 'user-to',
      amountCents: 100,
    });

    expect(r.statusCode).toBe(500);
    expect(r.body).toMatchObject({ error: 'DB error' });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'FAILED',
        responseStatusCode: 500,
      }),
      expect.any(Object)
    );
  });
});

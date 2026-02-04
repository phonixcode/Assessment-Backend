import { Router } from 'express';
import { postTransfer } from '../controllers/transferController';
import { postFundWallet, getWallet, getWalletLedger } from '../controllers/walletController';

const router = Router();
router.post('/transfer', postTransfer);
router.get('/wallets/:id/ledger', getWalletLedger);
router.get('/wallets/:id', getWallet);
router.post('/wallets/:id/fund', postFundWallet);
export default router;

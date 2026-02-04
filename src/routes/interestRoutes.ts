import { Router } from 'express';
import { postInterestAccrue, getInterestRecords } from '../controllers/interestController';

const router = Router();
router.get('/interest/records', getInterestRecords);
router.post('/interest/accrue', postInterestAccrue);
export default router;

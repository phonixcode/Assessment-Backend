import { Router } from 'express';
import { postUser, getUser } from '../controllers/userController';

const router = Router();
router.post('/users', postUser);
router.get('/users/:id', getUser);
export default router;

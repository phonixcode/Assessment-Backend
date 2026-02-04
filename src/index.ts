import 'dotenv/config';
import express from 'express';
import { sequelize } from './config';
import './models';
import transferRoutes from './routes/transferRoutes';
import interestRoutes from './routes/interestRoutes';
import userRoutes from './routes/userRoutes';

const app = express();
app.use(express.json());
app.use('/api', userRoutes);
app.use('/api', transferRoutes);
app.use('/api', interestRoutes);

const PORT = process.env.PORT ?? 3000;

async function start(): Promise<void> {
  await sequelize.authenticate();
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

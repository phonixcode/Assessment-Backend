import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize';
import { sequelize } from '../config';

export const TRANSACTION_LOG_STATES = ['PENDING', 'COMPLETED', 'FAILED'] as const;
export type TransactionLogState = (typeof TRANSACTION_LOG_STATES)[number];

export class TransactionLog extends Model<
  InferAttributes<TransactionLog>,
  InferCreationAttributes<TransactionLog>
> {
  declare id: CreationOptional<string>;
  declare idempotencyKey: string;
  declare state: TransactionLogState;
  declare fromWalletId: CreationOptional<string | null>;
  declare toWalletId: CreationOptional<string | null>;
  declare amountCents: CreationOptional<number | null>;
  declare errorMessage: CreationOptional<string | null>;
  declare responsePayload: CreationOptional<Record<string, unknown> | null>;
  declare responseStatusCode: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TransactionLog.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    idempotencyKey: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    state: { type: DataTypes.STRING(16), allowNull: false },
    fromWalletId: { type: DataTypes.UUID },
    toWalletId: { type: DataTypes.UUID },
    amountCents: { type: DataTypes.BIGINT },
    errorMessage: { type: DataTypes.TEXT },
    responsePayload: { type: DataTypes.JSONB },
    responseStatusCode: { type: DataTypes.INTEGER },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, modelName: 'TransactionLog', tableName: 'TransactionLogs' }
);

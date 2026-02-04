import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize';
import { sequelize } from '../config';

export class Ledger extends Model<InferAttributes<Ledger>, InferCreationAttributes<Ledger>> {
  declare id: CreationOptional<string>;
  declare walletId: string;
  declare amountCents: number;
  declare type: string;
  declare referenceId: CreationOptional<string | null>;
  declare referenceType: CreationOptional<string | null>;
  declare balanceAfterCents: CreationOptional<number | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Ledger.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    walletId: { type: DataTypes.UUID, allowNull: false },
    amountCents: { type: DataTypes.BIGINT, allowNull: false },
    type: { type: DataTypes.STRING(32), allowNull: false },
    referenceId: { type: DataTypes.STRING(64) },
    referenceType: { type: DataTypes.STRING(32) },
    balanceAfterCents: { type: DataTypes.BIGINT },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, modelName: 'Ledger', tableName: 'Ledgers' }
);

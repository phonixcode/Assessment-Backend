import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
} from 'sequelize';
import { sequelize } from '../config';

export class InterestRecord extends Model<
  InferAttributes<InterestRecord>,
  InferCreationAttributes<InterestRecord>
> {
  declare id: CreationOptional<string>;
  declare walletId: string;
  declare interestDate: string;
  declare balanceCentsAtEod: number;
  declare interestCents: number;
  declare rateUsed: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

InterestRecord.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    walletId: { type: DataTypes.UUID, allowNull: false },
    interestDate: { type: DataTypes.DATEONLY, allowNull: false },
    balanceCentsAtEod: { type: DataTypes.BIGINT, allowNull: false },
    interestCents: { type: DataTypes.BIGINT, allowNull: false },
    rateUsed: { type: DataTypes.DECIMAL(10, 6), allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false },
    updatedAt: { type: DataTypes.DATE, allowNull: false },
  },
  { sequelize, modelName: 'InterestRecord', tableName: 'InterestRecords' }
);

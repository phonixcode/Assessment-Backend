import { User } from './User';
import { Wallet } from './Wallet';
import { Ledger } from './Ledger';
import { TransactionLog } from './TransactionLog';
import { IdempotencyKey } from './IdempotencyKey';
import { InterestRecord } from './InterestRecord';

User.hasOne(Wallet, { foreignKey: 'userId', sourceKey: 'id' });
Wallet.belongsTo(User, { foreignKey: 'userId', targetKey: 'id' });

Wallet.hasMany(Ledger, { foreignKey: 'walletId', sourceKey: 'id' });
Ledger.belongsTo(Wallet, { foreignKey: 'walletId', targetKey: 'id' });

Wallet.hasMany(InterestRecord, { foreignKey: 'walletId', sourceKey: 'id' });
InterestRecord.belongsTo(Wallet, { foreignKey: 'walletId', targetKey: 'id' });

export { User, Wallet, Ledger, TransactionLog, IdempotencyKey, InterestRecord };

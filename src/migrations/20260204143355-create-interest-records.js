'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('InterestRecords', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      walletId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'Wallets', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      interestDate: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      balanceCentsAtEod: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      interestCents: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      rateUsed: { type: Sequelize.DECIMAL(10, 6), allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('InterestRecords', ['walletId', 'interestDate'], { unique: true });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('InterestRecords');
  },
};

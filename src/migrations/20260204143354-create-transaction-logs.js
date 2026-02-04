'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('TransactionLogs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        primaryKey: true,
      },
      idempotencyKey: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
      },
      state: {
        type: Sequelize.STRING(16),
        allowNull: false,
      },
      fromWalletId: { type: Sequelize.UUID },
      toWalletId: { type: Sequelize.UUID },
      amountCents: { type: Sequelize.BIGINT },
      errorMessage: { type: Sequelize.TEXT },
      responsePayload: { type: Sequelize.JSONB },
      responseStatusCode: { type: Sequelize.INTEGER },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('TransactionLogs', ['idempotencyKey']);
    await queryInterface.addIndex('TransactionLogs', ['state']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('TransactionLogs');
  },
};

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Ledgers', {
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
      amountCents: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      type: {
        type: Sequelize.STRING(32),
        allowNull: false,
      },
      referenceId: { type: Sequelize.STRING(64) },
      referenceType: { type: Sequelize.STRING(32) },
      balanceAfterCents: { type: Sequelize.BIGINT },
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('Ledgers', ['walletId']);
    await queryInterface.addIndex('Ledgers', ['referenceId', 'referenceType']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('Ledgers');
  },
};

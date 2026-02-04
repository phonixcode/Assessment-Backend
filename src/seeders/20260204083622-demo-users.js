'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    const userAId = 'aaaaaaaa-0000-4000-8000-000000000001';
    const userBId = 'bbbbbbbb-0000-4000-8000-000000000002';
    const walletAId = 'cccccccc-0000-4000-8000-000000000001';
    const walletBId = 'cccccccc-0000-4000-8000-000000000002';

    await queryInterface.bulkInsert(
      'Users',
      [
        { id: userAId, username: 'user-a', createdAt: now, updatedAt: now },
        { id: userBId, username: 'user-b', createdAt: now, updatedAt: now },
      ],
      {}
    );
    await queryInterface.bulkInsert(
      'Wallets',
      [
        {
          id: walletAId,
          walletNumber: 'WN1000000001',
          userId: userAId,
          balanceCents: 0,
          currency: 'NGN',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: walletBId,
          walletNumber: 'WN1000000002',
          userId: userBId,
          balanceCents: 0,
          currency: 'NGN',
          createdAt: now,
          updatedAt: now,
        },
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    const { Op } = Sequelize;
    await queryInterface.bulkDelete('Wallets', { walletNumber: { [Op.in]: ['WN1000000001', 'WN1000000002'] } }, {});
    await queryInterface.bulkDelete('Users', { username: { [Op.in]: ['user-a', 'user-b'] } }, {});
  },
};

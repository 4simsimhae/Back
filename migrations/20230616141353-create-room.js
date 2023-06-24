"use strict";
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Rooms", {
      roomId: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      kategorieId: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      kategorieName: {
        type: Sequelize.STRING,
      },
      roomName: {
        type: Sequelize.STRING,
      },
      debater: {
        type: Sequelize.INTEGER,
      },
      panel: {
        type: Sequelize.INTEGER,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable("Rooms");
  },
};

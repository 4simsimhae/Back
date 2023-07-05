'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('UserInfos', {
            userInfoId: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },
            userId: {
                type: Sequelize.INTEGER,
            },
            roomId: {
                type: Sequelize.INTEGER,
            },
            nickName: {
                type: Sequelize.STRING,
            },
            like: {
                type: Sequelize.INTEGER,
            },
            hate: {
                type: Sequelize.INTEGER,
            },
            questionMark: {
                type: Sequelize.INTEGER,
            },
            host: {
                type: DataTypes.INTEGER,
            },
            debater: {
                type: DataTypes.INTEGER,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('UserInfos');
    },
};

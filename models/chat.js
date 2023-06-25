'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Chat extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // Chat 모델과 Room 모델의 관계 설정
            Chat.belongsTo(models.Room, { foreignKey: 'roomId' });

            // Chat 모델과 UserInfo 모델의 관계 설정
            Chat.belongsTo(models.UserInfo, { foreignKey: 'userId' });
            // define association here
        }
    }
    Chat.init(
        {
            chatId: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER,
            },
            userId: {
                type: Sequelize.INTEGER,
            },
            roomId: {
                type: DataTypes.INTEGER,
            },
            chatList: {
                type: DataTypes.STRING,
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
            },
        },
        {
            sequelize,
            modelName: 'Chat',
            timestamps: true,
            updatedAt: false,
        }
    );
    return Chat;
};

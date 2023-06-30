'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class UserInfo extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            UserInfo.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user',
            });
            // define association here
        }
    }
    UserInfo.init(
        {
            userInfoId: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER,
            },
            userId: {
                type: DataTypes.INTEGER,
            },
            roomId: {
                type: DataTypes.INTEGER,
            },
            nickName: {
                type: DataTypes.STRING,
            },
            like: {
                type: DataTypes.INTEGER,
            },
            hate: {
                type: DataTypes.INTEGER,
            },
            questionMark: {
                type: DataTypes.INTEGER,
            },
            debater: {
                type: DataTypes.BOOLEAN,
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: DataTypes.DATE,
            },
        },
        {
            sequelize,
            modelName: 'UserInfo',
        }
    );
    return UserInfo;
};

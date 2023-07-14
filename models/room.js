'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Room extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    }
    Room.init(
        {
            roomId: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER,
            },
            kategorieId: {
                allowNull: false,
                primaryKey: true,
                type: DataTypes.INTEGER,
            },
            kategorieName: {
                type: DataTypes.STRING,
            },
            roomName: {
                type: DataTypes.STRING,
            },
            randomSubjects: {
                type: DataTypes.STRING,
            },
            debater: {
                type: DataTypes.INTEGER,
            },
            panel: {
                type: DataTypes.INTEGER,
            },
            gameStart: {
                type: DataTypes.INTEGER,
            },
            createdAt: {
                allowNull: false,
                type: DataTypes.DATE,
            },
        },
        {
            sequelize,
            modelName: 'Room',
            timestamps: true,
            updatedAt: false,
        }
    );
    return Room;
};

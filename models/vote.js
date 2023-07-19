'use strict';
const { Model } = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Vote extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
    }
    Vote.init(
        {
            roomId: DataTypes.INTEGER,
            debater1Count: DataTypes.INTEGER,
            debater2Count: DataTypes.INTEGER,
        },
        {
            sequelize,
            modelName: 'Vote',
        }
    );
    return Vote;
};

'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class UserInfo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  UserInfo.init({
    userId: DataTypes.INTEGER,
    roomId: DataTypes.INTEGER,
    nickName: DataTypes.STRING,
    like: DataTypes.INTEGER,
    hate: DataTypes.INTEGER,
    questionMark: DataTypes.INTEGER,
    debater: DataTypes.BOOLEAN
  }, {
    sequelize,
    modelName: 'UserInfo',
  });
  return UserInfo;
};
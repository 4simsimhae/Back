"use strict";
const { Model } = require("sequelize");
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
      kategorieName: DataTypes.STRING,
      roomName: DataTypes.STRING,
      debater: DataTypes.INTEGER,
      panel: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Room",
      timestamps: true,
      updatedAt: false,
    }
  );
  return Room;
};

const chat = require("./chat");
const debate = require("./debate");
const sroom = require("./sroom");

module.exports = (io) => {
  chat(io);
  sroom(io);
  debate(io);
};
const { io } = require("socket.io");

module.exports = (io) => {
  io.on("connection", (socket) => {
    socket["nickName"] = randomNickName();

    socket.onAny((event) => {
      console.log(`Socket Event: ${event}`);
    });

    socket.on("enter_room", (roomName, done) => {
      socket.join(roomName);
      done();
      io.to(roomName).emit("welcome", socket.nickName);
    });

    socket.on("disconnecting", () => {
      socket.rooms.forEach((room) => {
        io.to(room).emit("bye", socket.nickName);
      });
    });

    socket.on("new_message", (msg, room, done) => {
      io.to(room).emit("new_message", `${socket.nickName}: ${msg}`);
      done();
    });

    socket.on("nickName", (nickName) => {
      socket["nickName"] = nickName;
    });
  });
};

function randomNickName() {
  const adjectives = ["Happy", "Sad", "Funny", "Smart", "Brave"];
  const nouns = ["Cat", "Dog", "Bird", "Lion", "Tiger"];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adjective}_${noun}`;
}
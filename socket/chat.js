module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });
    });

    // "enter_room" 이벤트를 처리하여 토론방에 입장합니다.
    socket.on('enter_room', (roomName, done) => {
        // 해당 토론방에 소켓을 입장시킵니다.
        socket.join(roomName);
        done(); // 클라이언트에게 완료를 알립니다.
        // 토론방에 입장한 사용자에게 환영 메시지를 전송합니다.
        io.to(roomName).emit('welcome', socket.nickName);
    });

    // 소켓이 연결 해제될 때 실행되는 "disconnecting" 이벤트를 처리합니다.
    socket.on('disconnecting', () => {
        // 소켓이 속한 모든 토론방에 "bye" 메시지를 전송합니다.
        socket.rooms.forEach((room) => {
            io.to(room).emit('bye', socket.nickName);
        });
    });

    // "new_message" 이벤트를 처리하여 새로운 메시지를 전송합니다.
    socket.on('new_message', (msg, room, done) => {
        // 해당 토론방에 새로운 메시지를 전송합니다.
        io.to(room).emit('new_message', `${socket.nickName}: ${msg}`);
        done(); // 클라이언트에게 완료를 알립니다.
    });

    // "nickName" 이벤트를 처리하여 닉네임을 설정합니다.
    socket.on('nickName', (nickName) => {
        socket['nickName'] = nickName; // 소켓에 닉네임을 할당합니다.
    });
};

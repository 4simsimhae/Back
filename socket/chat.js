const { Chat, Room } = require('../models');

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });

        // // "enter_room" 이벤트를 처리하여 토론방에 입장합니다.
        // socket.on('enter_room', (roomId, done) => {
        //     // 해당 토론방에 소켓을 입장시킵니다.
        //     socket.join(roomId);
        //     done(); // 클라이언트에게 완료를 알립니다.
        //     // 토론방에 입장한 사용자에게 환영 메시지를 전송합니다.
        //     io.to(roomId).emit('welcome', socket.nickName);
        // });

        // 소켓이 연결 해제될 때 실행되는 "disconnecting" 이벤트를 처리합니다.
        socket.on('disconnecting', async () => {
            // 소켓이 속한 모든 토론방에 "bye" 메시지를 전송합니다.
            socket.rooms.forEach((room) => {
                io.to(room).emit('bye', socket.nickName);
            });

            try {
                const roomIdList = Array.from(socket.rooms);
                roomIdList.shift(); // 첫 번째 요소는 소켓의 고유 ID이므로 제거합니다.

                for (const roomId of roomIdList) {
                    const room = await Room.findOne({ where: { roomId } });

                    if (!room) {
                        // Room 테이블에서 해당 roomId를 찾지 못한 경우, Chat 테이블에서 삭제합니다.
                        await Chat.destroy({ where: { roomId } });
                    }
                }
            } catch (error) {
                console.error('방 삭제 처리 실패:', error);
            }
        });

        // "new_message" 이벤트를 처리하여 새로운 메시지를 전송하고 데이터베이스에 저장합니다.
        socket.on('new_message', async (msg, roomId, done) => {
            try {
                const nickName = '토론자';
                console.log('1 msg =', msg);

                // 해당 토론방에 새로운 메시지를 전송합니다.
                socket.to(roomId).emit('new_chat', `토론자: ${msg}`);
                done(); // 클라이언트에게 완료를 알립니다.

                // 채팅 내용을 데이터베이스에 저장합니다.
                const chat = await Chat.findOne({ where: { roomId } });

                if (chat) {
                    // 이미 존재하는 채팅 내용이라면 데이터를 업데이트합니다.
                    let chatData = JSON.parse(chat.chatList) || [];
                    chatData.push({ [nickName]: msg });
                    chat.chatList = JSON.stringify(chatData);
                    await chat.save();
                } else {
                    // 새로운 채팅 내용을 생성합니다.
                    await Chat.create({
                        roomId,
                        chatList: JSON.stringify([{ [nickName]: msg }]),
                    });
                }
            } catch (error) {
                console.error('채팅 저장 실패:', error);
            }
        });
    });
};

const { UserInfo, Room } = require('../models');
const randomNameMiddleware = require('../middlewares/randomName');
const checkLoginMiddleware = require('../middlewares/checkLogin');

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });
        // 토론자로 참여하기
        socket.on(
            'joinDebate',
            randomNameMiddleware,
            checkLoginMiddleware,
            async (userId, roomId, done) => {
                try {
                    // userId 조회
                    const user = await UserInfo.findOne({
                        where: { userId },
                    });
                    console.log('1 userId = ', userId);

                    if (!user) {
                        socket.emit('error', '유저를 찾을 수 없습니다.');
                        return;
                    }

                    // roomId로 선택한방 조회
                    const room = await Room.findOne({
                        where: { roomId },
                    });
                    console.log('2 roomId =', room.roomId);

                    if (!room) {
                        socket.emit('error', '입장할 수 있는 방이 없습니다.');
                        return;
                    }

                    // room에 입장
                    socket.join(room.roomId);
                    socket.roomId = room.roomId;
                    console.log('3 roomId =', room.roomId);

                    // debater,roomId,nickName 수정 및 DB에 저장
                    const nickName = socket.nickName;
                    user.debater = 0;
                    user.roomId = room.roomId;
                    user.nickName = nickName;

                    await user.save();

                    done();

                    socket.emit('debateJoined', { userId, nickName });
                } catch (error) {
                    console.error('토론 참여 처리 실패:', error);
                    socket.emit('error', '토론 참여 처리에 실패했습니다.');
                }
            }
        );

        // 배심원으로 참가하기
        socket.on(
            'joinJuror',
            randomNameMiddleware,
            async (userId, roomId, done) => {
                try {
                    // userId 조회
                    const user = await UserInfo.findOne({
                        where: { userId },
                    });
                    console.log('1 userId = ', userId);

                    if (!user) {
                        socket.emit('error', '유저를 찾을 수 없습니다.');
                        return;
                    }

                    // roomId로 선택한방 조회
                    const room = await Room.findOne({
                        where: { roomId },
                    });
                    console.log('2 roomId =', room.roomId);

                    if (!room) {
                        socket.emit('error', '입장할 수 있는 방이 없습니다.');
                        return;
                    }

                    // room에 입장
                    socket.join(room.roomId);
                    socket.roomId = room.roomId;
                    console.log('3 roomId =', room.roomId);

                    // debater,roomId,nickName 수정 및 DB에 저장
                    const nickName = socket.nickName;
                    user.debater = 0;
                    user.roomId = room.roomId;
                    user.nickName = nickName;

                    await user.save();

                    done();

                    socket.emit('jurorJoined', { userId, nickName });
                } catch (error) {
                    console.error('배심원 참여 처리 실패:', error);
                    socket.emit('error', '배심원 참여 처리에 실패했습니다.');
                }
            }
        );
    });
};

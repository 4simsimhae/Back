const { UserInfo, Kategorie, Room, Subject, Chat } = require('../models');
const axios = require('axios');

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });
        // 토론자로 참여하기
        socket.on('joinDebate', async (userId, roomId, done) => {
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

                // debater 수정 및 DB에 저장
                user.debater = 1;
                await user.save();

                // 랜덤 닉네임 가져오기
                const nickname = await getRandomNickname();

                // 닉네임 수정 및 DB에 저장
                user.nickname = nickname;
                await user.save();

                done();

                socket.emit('debateJoined', { userId, nickname });
            } catch (error) {
                console.error('토론 참여 처리 실패:', error);
                socket.emit('error', '토론 참여 처리에 실패했습니다.');
            }
        });

        // 배심원으로 참가하기
        socket.on('joinJuror', async (userId, roomId, done) => {
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

                // debater 수정 및 DB에 저장
                user.debater = 0;
                await user.save();

                // 랜덤 닉네임 가져오기
                const nickname = await getRandomNickname();

                // 닉네임 수정 및 DB에 저장
                user.nickname = nickname;
                await user.save();

                done();

                socket.emit('jurorJoined', { userId, nickname });
            } catch (error) {
                console.error('배심원 참여 처리 실패:', error);
                socket.emit('error', '배심원 참여 처리에 실패했습니다.');
            }
        });
    });
};

// 랜덤 닉네임 가져오기
async function getRandomNickname() {
    try {
        const response = await axios.get(
            'https://nickname.hwanmoo.kr/?format=json&count=1'
        );
        const nickname = response.data.words[0];
        return nickname;
    } catch (error) {
        console.error('랜덤 닉네임 가져오기 실패:', error);
        throw error;
    }
}

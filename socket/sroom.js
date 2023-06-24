const { UserInfo, Room, Subject, Chat } = require('../models');

module.exports = (socket) => {
    // 토론자로 참여하기
    socket.on('joinDebate', async (userId) => {
        try {
            // userId 조회
            const user = await UserInfo.findOne({
                where: { userId },
            });

            if (!user) {
                socket.emit('error', '유저를 찾을 수 없습니다.');
                return;
            }

            // debater 값 '1'로 변경
            user.debater = 1;
            await user.save();

            // 클라이언트에게 정보 전달
            socket.emit('debateJoined', {
                userId,
                subject: selectedSubject.subjectList,
                roomId: room.roomId,
            });
        } catch (error) {
            console.error('토론 참여 처리 실패:', error);
            socket.emit('error', '토론 참여 처리에 실패했습니다.');
        }
    });

    // 배심원으로 참가하기
    socket.on('joinJuror', async (userId) => {
        try {
            // userId 조회
            const user = await UserInfo.findOne({
                where: { userId },
            });

            if (!user) {
                socket.emit('error', '유저를 찾을 수 없습니다.');
                return;
            }

            // debater 값 '0'으로 변경
            user.debater = 0;
            await user.save();

            socket.emit('jurorJoined', { userId });
        } catch (error) {
            console.error('배심원 참여 처리 실패:', error);
            socket.emit('error', '배심원 참여 처리에 실패했습니다.');
        }
    });

    // 토론방 만들기
    socket.on('createRoom', async (userId) => {});
};

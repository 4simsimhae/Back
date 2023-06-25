const { UserInfo, Kategorie, Room, Subject, Chat } = require('../models');

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(socket);
    });

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

            // debater 수정 및 DB에 저장
            user.debater = 1;
            await user.save();

            // 클라이언트에게 정보 전달
            socket.emit('debateJoined', {
                userId,
                roomId: socket.roomId,
                debater,
                nickname,
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

            // 랜덤 닉네임 가져오기
            const nickname = await getRandomNickname();

            // 닉네임 수정 및 DB에 저장
            user.nickname = nickname;
            await user.save();

            socket.emit('jurorJoined', { userId, nickname });
        } catch (error) {
            console.error('배심원 참여 처리 실패:', error);
            socket.emit('error', '배심원 참여 처리에 실패했습니다.');
        }
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

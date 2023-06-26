const { UserInfo, Room, Chat } = require('../models');
const { socketRandomName } = require('../middlewares/randomName');
// const { socketCheckLogin } = require('../middlewares/checkLogin');

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });

        // 토론자로 참여하기
        socket.on(
            'joinDebate', socketRandomName,async (userId, roomId, done) => {
                try {
                    // const token = data.token;
                    // console.log('Received token:', token);
                    // userId 조회
                    const user = await UserInfo.findOne({
                        where: { userId },
                    });

                    console.log('1 userId = ', userId);

                    if (!user) {
                        socket.emit('error', '유저를 찾을 수 없습니다.');
                        return;
                    }

                    // roomId로 선택한 방 조회
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

                    // debater, roomId, nickName 수정 및 DB에 저장
                    const nickName = socket.nickName;
                    console.log("이거 적용되냐?",nickName)
                    user.debater = 1; // 토론자로 설정
                    user.roomId = room.roomId;
                    user.nickName = nickName;

                    await user.save();

                    done();

                    socket.emit('debateJoined', { userId });
                } catch (error) {
                    console.error('토론 참여 처리 실패:', error);
                    socket.emit('error', '토론 참여 처리에 실패했습니다.');
                }
            }
        );

        // 배심원으로 참가하기
        socket.on(
            'joinJuror', socketRandomName,async (userId, roomId, done) => {
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

                    // roomId로 선택한 방 조회
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

                    // debater, roomId, nickName 수정 및 DB에 저장
                    const nickName = socket.nickName;
                    console.log("이거 적용되냐?",nickName)
                    user.debater = 0; // 배심원으로 설정
                    user.roomId = room.roomId;
                    user.nickName = nickName;

                    await user.save();

                    done();

                    socket.emit('jurorJoined', { userId });
                } catch (error) {
                    console.error('배심원 참여 처리 실패:', error);
                    socket.emit('error', '배심원 참여 처리에 실패했습니다.');
                }
            }
        );

        socket.on('startDebate', async (roomId) => {
            try {
                const debaterUsers = await UserInfo.findAll({
                    where: { roomId, debater: 1 },
                });

                const voteCounts = {}; // 토론자들의 투표 수를 저장할 객체

                // 배심원들의 투표 수 초기화
                for (const user of debaterUsers) {
                    voteCounts[user.userId] = 0;
                }

                // 토론 후 배심원들의 투표
                socket.on('vote', (votedUserId) => {
                    // 유효한 토론자인지 확인합니다.
                    if (
                        debaterUsers.some((user) => user.userId === votedUserId)
                    ) {
                        // 해당 토론자에 대한 투표 수를 증가
                        voteCounts[votedUserId]++;
                    }
                });

                // 토론이 종료되고 승자를 결정
                let maxVotes = 0;
                let winnerUserId = null;

                // 투표 수를 확인하여 승자 결정
                for (const userId in voteCounts) {
                    if (voteCounts[userId] > maxVotes) {
                        maxVotes = voteCounts[userId];
                        winnerUserId = userId;
                    }
                }

                // 토론자들의 상태를 업데이트
                for (const user of debaterUsers) {
                    if (user.userId === winnerUserId) {
                        user.debater = 1; // 승자는 토론자로 유지, like, hate, questionMark 초기화
                        user.like = 0;
                        user.hate = 0;
                        user.questionMark = 0;
                    } else {
                        user.debater = 0; // 패자는 토론자 자격 박탈, like, hate, questionMark 초기화
                        user.like = 0;
                        user.hate = 0;
                        user.questionMark = 0;
                    }
                    await user.save();
                }
            } catch (error) {
                console.error('토론 처리 실패:', error);
                socket.emit('error', '토론 처리에 실패했습니다.');
            }
        });
    });
};

// query: {
//     token: localStorage.getItem("authorization"),
// }

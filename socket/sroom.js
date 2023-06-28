const { UserInfo, Room, Chat } = require('../models');
const socketRandomName = require('../middlewares/socketRandomName');
// const { socketCheckLogin } = require('../middlewares/socketCheckLogin');

module.exports = (io) => {
    let nickNames = [];
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });

        // 방인원 체크
        async function updateRoomCount(roomId) {
            // roomId를 받아서 UserInfo 테이블에서 roomId가 일치 하면서 debater값이 0,1인 인원수 카운트
            const [debateUserCount, jurorUserCount] = await Promise.all([
                UserInfo.count({ where: { roomId, debater: 1 } }),
                UserInfo.count({ where: { roomId, debater: 0 } }),
            ]);

            // Room테이블 업데이트
            await Room.update(
                { debater: debateUserCount, panel: jurorUserCount },
                { where: { roomId } }
            );
        }

        // 토론자로 참여하기
        socket.on('joinDebate', async (userId, roomId, done) => {
            try {
                const user = await UserInfo.findOne({
                    where: { userId },
                });
                console.log('1=', 1);
                if (!user) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                const room = await Room.findOne({ where: { roomId } });
                console.log('2=', 2);
                if (!room) {
                    socket.emit('error', '입장할 수 있는 방이 없습니다.');
                    return;
                }

                socket.join(room.roomId);
                socket.roomId = room.roomId;

                if (!socket.locals) {
                    socket.locals = {};
                }

                await new Promise((resolve) => {
                    socketRandomName(socket, () => {
                        const nickName = socket.locals.random;
                        socket.nickName = nickName;
                        user.debater = 1;
                        user.roomId = room.roomId;
                        user.nickName = nickName;

                        user.save().then(() => {
                            done();

                            nickNames.push(nickName);
                            //연결된 socket 전체에게 입장한 유저 nickNames 보내기
                            io.to(roomId).emit('roomJoined', nickNames);

                            resolve();
                        });
                        console.log('4=', 4);
                    });
                });
                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                console.log('3=', 3);
                socket.on('disconnecting', async () => {
                    // 방 나가기전에 user정보 초기화
                    const nickName = socket.nickName;
                    nickNames = nickNames.filter((item) => item !== nickName);
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;

                    //user 정보 초기화 후 db에 저장
                    await user.save();

                    // 방 퇴장 유저 nickName 프론트로 전달
                    io.to(roomId).emit('roomLeft', nickName);

                    // 방 퇴장 후 남아있는 nickName 리스트 보내기
                    io.to(roomId).emit('roomJoined', nickNames);

                    //방인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);
                });
            } catch (error) {
                console.error('토론자 참여 처리 실패:', error);
                socket.emit('error', '토론자 참여 처리에 실패했습니다.');
            }
        });

        // 배심원으로 참가하기
        socket.on('joinJuror', async (userId, roomId, done) => {
            try {
                console.log('1=', 1);
                const user = await UserInfo.findOne({ where: { userId } });

                if (!user) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                const room = await Room.findOne({ where: { roomId } });

                if (!room) {
                    socket.emit('error', '입장할 수 있는 방이 없습니다.');
                    return;
                }
                console.log('2=', 2);
                socket.join(room.roomId);
                socket.roomId = room.roomId;

                if (!socket.locals) {
                    socket.locals = {};
                }

                //socket(방) 입장 시 닉네임 랜덤API 이용해서 부여
                await new Promise((resolve) => {
                    socketRandomName(socket, () => {
                        const nickName = socket.locals.random;
                        socket.nickName = nickName;
                        user.debater = 0;
                        user.roomId = room.roomId;
                        user.nickName = nickName;

                        user.save().then(() => {
                            done();
                            //socket(방)에 입장한 닉네임 리스트 만들기
                            nickNames.push(nickName);
                            //연결된 socket 전체에게 남아 있는 nickNames 보내기
                            io.to(roomId).emit('roomJoined', nickNames);

                            resolve();
                        });
                    });
                });
                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                socket.on('disconnecting', async () => {
                    //socket(방) 나가기전에 user정보 초기화
                    const nickName = socket.nickName;
                    nickNames = nickNames.filter((item) => item !== nickName);
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;

                    //user 정보 초기화 후 db에 저장
                    await user.save();

                    //연결된 socket 전체에게 나간 유저 nickName 보내기
                    io.to(roomId).emit('roomLeft', nickName);

                    //연결된 socket 전체에게 남아 있는 nickNames 보내기
                    io.to(roomId).emit('roomJoined', nickNames);

                    //방인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);
                });
            } catch (error) {
                console.error('배심원 참여 처리 실패:', error);
                socket.emit('error', '배심원 참여 처리에 실패했습니다.');
            }
        });

        // 게임 시작
        socket.on('startDebate', async (roomId) => {
            try {
                const debaterUsers = await UserInfo.findAll({
                    where: { roomId, debater: 1 },
                });

                const voteCounts = {};

                // 토론자들의 투표 수 초기화
                for (const user of debaterUsers) {
                    voteCounts[user.userId] = 0;
                }

                // 토론 후 배심원들의 투표
                socket.on('vote', (votedUserId) => {
                    if (
                        debaterUsers.some((user) => user.userId === votedUserId)
                    ) {
                        voteCounts[votedUserId]++;
                    }
                });

                // 토론이 종료되고 승자 결정
                let maxVotes = 0;
                let winnerUserId = null;

                for (const userId in voteCounts) {
                    if (voteCounts[userId] > maxVotes) {
                        maxVotes = voteCounts[userId];
                        winnerUserId = userId;
                    }
                }

                // 토론자들의 상태 업데이트
                for (const user of debaterUsers) {
                    if (user.userId === winnerUserId) {
                        user.debater = 1;
                        user.like = 0;
                        user.hate = 0;
                        user.questionMark = 0;
                    } else {
                        user.debater = 0;
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

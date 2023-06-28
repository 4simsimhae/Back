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
            const debateUser = await UserInfo.count({
                where: { roomId, debater: 1 },
            });
            const jurorUser = await UserInfo.count({
                where: { roomId, debater: 0 },
            });

            await Room.update(
                { debater: debateUser, panel: jurorUser },
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

                //
                updateRoomCount(room.roomId);

                if (!socket.locals) {
                    socket.locals = {};
                }

                socketRandomName(socket, () => {
                    const nickName = socket.locals.random;
                    socket.nickName = nickName;
                    user.debater = 1;
                    user.roomId = room.roomId;
                    user.nickName = nickName;

                    user.save().then(() => {
                        done();

                        nickNames.push(nickName);
                        io.to(roomId).emit('roomJoined', nickNames);
                    });
                    console.log('4=', 4);
                });

                console.log('3=', 3);
                socket.on('disconnecting', () => {
                    const nickName = socket.nickName;
                    nickNames = nickNames.filter((item) => item !== nickName);
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;
                    user.save();
                    io.to(roomId).emit('roomLeft', nickName);
                    io.to(roomId).emit('roomJoined', nickNames);

                    updateRoomCount(room.roomId);
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

                //
                updateRoomCount(room.roomId);

                if (!socket.locals) {
                    socket.locals = {};
                }

                socketRandomName(socket, () => {
                    const nickName = socket.locals.random;
                    socket.nickName = nickName;
                    user.debater = 0;
                    user.roomId = room.roomId;
                    user.nickName = nickName;

                    user.save().then(() => {
                        done();

                        nickNames.push(nickName);
                        io.to(roomId).emit('roomJoined', nickNames);
                    });
                    console.log('4=', 4);
                });
                console.log('3=', 3);
                socket.on('disconnecting', () => {
                    const nickName = socket.nickName;
                    nickNames = nickNames.filter((item) => item !== nickName);
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;
                    io.to(roomId).emit('roomLeft', nickName);
                    io.to(roomId).emit('roomJoined', nickNames);
                    updateRoomCount(room.roomId);
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

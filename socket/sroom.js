const { UserInfo, Room, User, Chat, Subject } = require('../models');
const socketRandomName = require('../middlewares/socketRandomName');
const socketCheckLogin = require('../middlewares/socketCheckLogin');

module.exports = (io) => {
    io.of('/roomList').on('connection', (socket) => {
        console.log('roomList 생성');
        socket.on('update', async (kategorieId) => {
            try {
                // 잘못된 kategorieId
                if (kategorieId > 8 || kategorieId < 1) {
                    const response = new response(
                        403,
                        '해당 카테고리를 찾을 수 없습니다.'
                    );
                    socket.emit('error', response); // 수정: 에러를 클라이언트에게 보냄
                    return;
                }

                const roomList = await Room.findAll({
                    attributes: [
                        'roomId',
                        'KategorieName',
                        'roomName',
                        'debater',
                        'panel',
                    ],
                    where: { kategorieId },
                    // order: [],
                });

                const response = new response(200, '', roomList);
                socket.emit('update_roomList', response); // 수정: 결과를 클라이언트에게 보냄
            } catch (error) {
                const response = new response(
                    500,
                    '예상하지 못한 서버 문제가 발생했습니다.'
                );
                socket.emit('error', response); // 수정: 에러를 클라이언트에게 보냄
            }
        });
    });

    // 프론트로 보내줄꺼 update_roomList

    const nickNames = {};
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });
        // 룸리스트

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
        socket.on('joinDebate', async (roomId, done) => {
            try {
                await socketCheckLogin(socket, (err) => {
                    if (err) {
                        return done(err.message);
                    }
                });
                console.log('넘어온유저아이디=', socket.locals.user.userId);
                const user = await UserInfo.findOne({
                    where: { userId: socket.locals.user.userId },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['kakaoId'],
                        },
                    ],
                });
                console.log('1=', 1);
                if (!user) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                console.log('kakaoId=', user.user.kakaoId);
                if (user.user.kakaoId == 0) {
                    // console.log('조건이 일치함');
                    // console.log('kakaoId=', user.user.kakaoId);
                    // socket.emit('error', '로그인이 필요합니다.');
                    // console.log('Socket Event: error');
                    done('msg');
                    return;
                }

                console.log('roomId=', roomId);
                const room = await Room.findOne({ where: { roomId } });
                console.log('2=', 2);
                if (!room) {
                    socket.emit('error', '입장할 수 있는 방이 없습니다.');
                    return;
                }

                socket.join(room.roomId);
                socket.roomId = room.roomId;

                // 방이 존재하지 않을 경우 방과 nickNames를 초기화한 빈 배열로 생성
                if (!nickNames[roomId]) {
                    nickNames[roomId] = { nickNames: [] };
                }

                if (!Array.isArray(nickNames[roomId].nickNames)) {
                    nickNames[roomId].nickNames = [];
                }

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

                            nickNames[roomId].nickNames = [
                                ...nickNames[roomId].nickNames,
                                nickName,
                            ];
                            console.log(nickNames[roomId].nickNames);
                            //연결된 socket 전체에게 입장한 유저 nickNames 보내기
                            io.to(roomId).emit(
                                'roomJoined',
                                nickNames[roomId].nickNames
                            );

                            resolve();
                        });
                        console.log('3=', 3);
                    });
                });
                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                console.log('4=', 4);
                socket.on('disconnecting', async () => {
                    // 방 나가기전에 user정보 초기화
                    const nickName = socket.nickName;
                    nickNames[roomId].nickNames = nickNames[
                        roomId
                    ].nickNames.filter((item) => item !== nickName);
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
                    io.to(roomId).emit(
                        'roomJoined',
                        nickNames[roomId].nickNames
                    );

                    //방인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);
                });
            } catch (error) {
                console.error('토론자 참여 처리 실패:', error);
                socket.emit('error', '토론자 참여 처리에 실패했습니다.');
            }
        });

        // 배심원으로 참가하기
        socket.on('joinJuror', async (roomId, done) => {
            try {
                await socketCheckLogin(socket, (err) => {
                    if (err) {
                        return done(err.message);
                    }
                });
                console.log('1=', 1);
                const user = await UserInfo.findOne({
                    where: { userId: socket.locals.user.userId },
                });
                console.log(user);

                if (!user) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                const room = await Room.findOne({ where: { roomId } });
                console.log(room);

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

                // 방이 존재하지 않을 경우 방과 nickNames를 초기화한 빈 배열로 생성
                if (!nickNames[roomId]) {
                    nickNames[roomId] = { nickNames: [] };
                }

                if (!Array.isArray(nickNames[roomId].nickNames)) {
                    nickNames[roomId].nickNames = [];
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
                            nickNames[roomId].nickNames = [
                                ...nickNames[roomId].nickNames,
                                nickName,
                            ];
                            console.log(
                                '닉네임리스트 =',
                                nickNames[roomId].nickNames
                            );
                            //연결된 socket 전체에게 남아 있는 nickNames 보내기
                            io.to(roomId).emit(
                                'roomJoined',
                                nickNames[roomId].nickNames
                            );

                            resolve();
                        });
                    });
                });
                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                socket.on('disconnecting', async () => {
                    //socket(방) 나가기전에 user정보 초기화
                    const nickName = socket.nickName;
                    nickNames[roomId].nickNames = nickNames[
                        roomId
                    ].nickNames.filter((item) => item !== nickName);
                    console.log('닉네임리스트2 =', nickNames[roomId].nickNames);
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
                    io.to(roomId).emit(
                        'roomJoined',
                        nickNames[roomId].nickNames
                    );

                    //방인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);
                });
            } catch (error) {
                console.error('배심원 참여 처리 실패:', error);
                socket.emit('error', '배심원 참여 처리에 실패했습니다.');
            }
        });

        //

        // 게임 시작
        socket.on('show_roulette', async (result, done) => {
            try {
                const roomId = socket.roomId;
                console.log('roomId =', roomId);

                const room = await Room.findOne({
                    where: { roomId },
                });

                const kategorieId = room.kategorieId;
                console.log('kategorieId =', kategorieId);

                const subjectList = await Subject.findOne({
                    where: { kategorieId },
                    attributes: ['subjectList'],
                });
                console.log('subjectList=', subjectList);

                const allSubjects = JSON.parse(
                    subjectList.dataValues.subjectList
                );
                console.log('allSubjects=', allSubjects);

                const randomSubject = room.randomSubjects || []; // 기존 값이 NULL인 경우 빈 배열로 초기화

                // 배열값을 랜덤으로 배치 후 제일 앞에 8개 선정
                const randomSubjectArr = getRandomSubjects(allSubjects, 8);
                console.log('randomSubjects=', randomSubjectArr);
                console.log('result=', result);

                // Room 테이블의 randomSubjects 컬럼 업데이트
                await Room.update(
                    { randomSubjects: JSON.stringify(randomSubjectArr) },
                    { where: { roomId } }
                );

                // 저장된 randomSubjects 값을 클라이언트로 전송
                io.to(socket.roomId).emit(
                    'show_roulette',
                    randomSubjectArr,
                    result
                );

                done();
            } catch (error) {
                console.error('주제 룰렛 실행 실패:', error);
                socket.emit('error', '주제 룰렛 실행에 실패했습니다.');
            }
        });

        function getRandomSubjects(subjects, count) {
            const shuffled = subjects.sort(() => 0.5 - Math.random()); // 배열을 랜덤하게 섞음
            return shuffled.slice(0, count); // 앞에서부터 count 개수만큼의 요소 반환
        }

        socket.on('start_roulette', async (roomId, done) => {
            try {
                const room = await Room.findOne({
                    where: { roomId },
                });

                let randomSubject = [];

                if (room.randomSubjects) {
                    randomSubject = JSON.parse(room.randomSubjects);
                }

                if (randomSubject.length === 0) {
                    throw new Error('랜덤 주제가 없습니다.');
                }

                const randomSubjectIndex = Math.floor(
                    Math.random() * randomSubject.length
                );
                console.log('randomSubjectIndex=', randomSubjectIndex);

                const selectedSubject = randomSubject[randomSubjectIndex]; // 선택된 주제
                console.log('selectedSubject=', selectedSubject);

                await Room.update(
                    { roomName: selectedSubject },
                    { where: { roomId } }
                );

                const updatedRoom = await Room.findOne({
                    where: { roomId },
                });
                console.log('roomName =', updatedRoom.roomName);

                io.to(roomId).emit('start_roulette', randomSubjectIndex);
                done();
            } catch (error) {
                console.error('룰렛 실행 실패:', error);
                socket.emit('error', '룰렛 실행에 실패했습니다.');
            }
        });

        socket.on('close_result', async (result, roomId, done) => {
            io.to(roomId).emit('close_result', result);
            done();
        });

        socket.on('close_roulette', async (result, roomId, done) => {
            io.to(roomId).emit('close_roulette', result);
            done();
        });

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

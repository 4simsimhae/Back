const { UserInfo, Room, User, Chat, Subject } = require('../models');
const socketRandomName = require('../middlewares/socketRandomName');
const socketCheckLogin = require('../middlewares/socketCheckLogin');
const socketRandomAvatar = require('../middlewares/socketRandomAvatar');

// // 중복 접속 방지
// const connectedIPs = new Set();

const getRoomList = async (kategorieId) => {
    const roomList = await Room.findAll({
        attributes: ['roomId', 'KategorieName', 'roomName', 'debater', 'panel'],
        where: { kategorieId },
        order: [['createdAt', 'DESC']],
    });
    return roomList;
};

//빈방 삭제
const deleteEmptyRooms = async () => {
    try {
        // 빈 방 조회
        const emptyRooms = await Room.findAll({
            where: {
                debater: 0,
                panel: 0,
            },
        });

        // 빈 방 삭제
        await Promise.all(emptyRooms.map((room) => room.destroy()));

        console.log('빈방을 삭제 하였습니다.');
    } catch (error) {
        console.error('빈방 삭제에 실패 하였습니다.');
    }
};

module.exports = (io) => {
    io.of('/roomList').on('connection', (socket) => {
        deleteEmptyRooms();
        console.log('roomList 생성');
        socket.on('update', async (kategorieId) => {
            try {
                // const clientIP = socket.handshake.address;
                // console.log('클라이언트가 접속했습니다. IP 주소:', clientIP);

                // // 이미 접속된 IP 주소인지 확인
                // if (connectedIPs.has(clientIP)) {
                //     console.log(
                //         '이미 접속된 IP 주소입니다. 접속을 거부합니다.'
                //     );
                //     socket.emit('error', '이미 접속된 IP 주소입니다.');
                //     socket.disconnect(true); // 클라이언트의 연결을 강제로 끊습니다.
                //     return;
                // }

                // // 접속 허용되었을 경우, 해당 IP 주소를 연결된 IP 주소 목록에 추가
                // connectedIPs.add(clientIP);
                // console.log('connectedIPs=', connectedIPs);

                console.log('kategorieId =', kategorieId);
                // 잘못된 kategorieId
                if (kategorieId > 8 || kategorieId < 1) {
                    const response = new response(
                        403,
                        '해당 카테고리를 찾을 수 없습니다.'
                    );
                    socket.emit('error', response); // 수정: 에러를 클라이언트에게 보냄
                    return;
                }

                await socket.join(kategorieId);
                const roomList = await getRoomList(kategorieId);

                // const response = new response(200, '', roomList);
                socket.emit('update_roomList', roomList); // 수정: 결과를 클라이언트에게 보냄
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
    const avatars = {};
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
        socket.on('joinDebate', async (roomId, kategorieId, done) => {
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

                if (!avatars[roomId]) {
                    avatars[roomId] = { avatars: [] };
                }

                if (!socket.locals) {
                    socket.locals = {};
                }

                await socketRandomAvatar(socket, async () => {
                    const userId = socket.locals.user.userId;
                    const userInfo = await UserInfo.findOne({
                        where: { userId },
                    });
                    if (userInfo) {
                        const avatar = userInfo.avatar;
                        console.log('avatar =', avatar);
                    }
                    return;
                });

                await new Promise((resolve) => {
                    socketRandomName(socket, async () => {
                        const nickName = socket.locals.random;
                        socket.nickName = nickName;
                        user.debater = 1;
                        user.roomId = room.roomId;
                        user.nickName = nickName;

                        //방장 권한 주기
                        const userExists = await UserInfo.findOne({
                            where: {
                                roomId: room.roomId,
                                host: 1,
                            },
                        });

                        if (userExists) {
                            user.host = 0;
                        } else {
                            user.host = 1;
                        }

                        user.save().then(() => {
                            done();

                            nickNames[roomId].nickNames = [
                                ...nickNames[roomId].nickNames,
                                nickName,
                            ];
                            console.log(nickNames[roomId].nickNames);

                            avatars[roomId].avatars = [
                                ...avatars[roomId].avatars,
                                socket.locals.avatar,
                            ];
                            console.log(avatars[roomId].avatars);

                            const data = {
                                nicknames: nickNames[roomId].nickNames,
                                avatars: avatars[roomId].avatars,
                            };
                            console.log('data=', data);
                            //연결된 socket 전체에게 입장한 유저 nickNames 보내기
                            io.to(roomId).emit('roomJoined', data);

                            resolve();
                        });
                        console.log('3=', 3);
                    });
                });
                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                const roomList = await getRoomList(kategorieId);

                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                console.log('4=', 4);
                socket.on('disconnecting', async () => {
                    // 방 나가기전에 user정보 초기화
                    const nickName = socket.nickName;
                    nickNames[roomId].nickNames = nickNames[
                        roomId
                    ].nickNames.filter((item) => item !== nickName);
                    user.host = 0;
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;

                    // 방에서 나간 사용자의 아바타 제거
                    avatars[roomId].avatars = avatars[roomId].avatars.filter(
                        (avatar) => avatar !== socket.locals.avatar
                    );

                    //user 정보 초기화 후 db에 저장
                    await user.save();

                    // 방 퇴장 유저 nickName 프론트로 전달
                    io.to(roomId).emit('roomLeft', nickName);

                    // 방 퇴장 후 남아있는 nickName 리스트 보내기
                    io.to(roomId).emit('roomJoined', data);
                    console.log('data =', data);

                    //방인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);
                    const roomList = await getRoomList(kategorieId);
                    await deleteEmptyRooms();

                    // // ip연결 정보 삭제
                    // const clientIP = socket.request.connection.remoteAddress;
                    // await connectedIPs.delete(clientIP);
                    // console.log(
                    //     '클라이언트가 연결을 종료했습니다. IP 주소:',
                    //     clientIP
                    // );

                    // console.log('connectedIPs=', connectedIPs);

                    // 네임스페이스에 룸리스트 보내기
                    io.of('/roomList')
                        .to(kategorieId)
                        .emit('update_roomList', roomList);
                });
            } catch (error) {
                console.error('토론자 참여 처리 실패:', error);
                socket.emit('error', '토론자 참여 처리에 실패했습니다.');
            }
        });

        // 배심원으로 참가하기
        socket.on('joinJuror', async (roomId, kategorieId, done) => {
            try {
                // const clientIP = socket.handshake.address;
                // console.log('클라이언트가 접속했습니다. IP 주소:', clientIP);

                // // 이미 접속된 IP 주소인지 확인
                // if (connectedIPs.has(clientIP)) {
                //     console.log(
                //         '이미 접속된 IP 주소입니다. 접속을 거부합니다.'
                //     );
                //     socket.emit('error', '이미 접속된 IP 주소입니다.');
                //     socket.disconnect(true); // 클라이언트의 연결을 강제로 끊습니다.
                //     return;
                // }

                // // 접속 허용되었을 경우, 해당 IP 주소를 연결된 IP 주소 목록에 추가
                // connectedIPs.add(clientIP);
                // console.log('connectedIPs=', connectedIPs);

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

                // 방이 존재하지 않을 경우 방과 nickNames를 초기화한 빈 배열로 생성
                if (!nickNames[roomId]) {
                    nickNames[roomId] = { nickNames: [] };
                }

                if (!Array.isArray(nickNames[roomId].nickNames)) {
                    nickNames[roomId].nickNames = [];
                }

                if (!avatars[roomId]) {
                    avatars[roomId] = { avatars: [] };
                }

                if (!socket.locals) {
                    socket.locals = {};
                }

                await socketRandomAvatar(socket, async () => {
                    const userId = socket.locals.user.userId;
                    const userInfo = await UserInfo.findOne({
                        where: { userId },
                    });
                    if (userInfo) {
                        const avatar = userInfo.avatar;
                        console.log('avatar =', avatar);
                    }
                    return;
                });

                //socket(방) 입장 시 닉네임 랜덤API 이용해서 부여
                await new Promise((resolve) => {
                    socketRandomName(socket, () => {
                        const nickName = socket.locals.random;
                        socket.nickName = nickName;
                        user.host = 0;
                        user.debater = 0;
                        user.roomId = room.roomId;
                        user.nickName = nickName;

                        // 방에서 나간 사용자의 아바타 제거
                        avatars[roomId].avatars = avatars[
                            roomId
                        ].avatars.filter(
                            (avatar) => avatar !== socket.locals.avatar
                        );

                        user.save().then(() => {
                            done();
                            //socket(방)에 입장한 닉네임 리스트 만들기
                            nickNames[roomId].nickNames = [
                                ...nickNames[roomId].nickNames,
                                nickName,
                            ];
                            console.log(nickNames[roomId].nickNames);

                            //socket(방)에 입장한 아바타 리스트 만들기
                            avatars[roomId].avatars = [
                                ...avatars[roomId].avatars,
                                socket.locals.avatar,
                            ];
                            console.log(avatars[roomId].avatars);

                            const data = {
                                nicknames: nickNames[roomId].nickNames,
                                avatars: avatars[roomId].avatars,
                            };
                            console.log('data=', data);
                            //연결된 socket 전체에게 입장한 유저 nickNames 보내기
                            io.to(roomId).emit('roomJoined', data);

                            resolve();
                        });
                    });
                });
                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                const roomList = await getRoomList(kategorieId);

                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                socket.on('disconnecting', async () => {
                    //socket(방) 나가기전에 user정보 초기화
                    const nickName = socket.nickName;
                    nickNames[roomId].nickNames = nickNames[
                        roomId
                    ].nickNames.filter((item) => item !== nickName);
                    console.log('닉네임리스트2 =', nickNames[roomId].nickNames);
                    user.host = 0;
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;

                    // 방에서 나간 사용자의 아바타 제거
                    avatars[roomId].avatars = avatars[roomId].avatars.filter(
                        (avatar) => avatar !== socket.locals.avatar
                    );

                    //user 정보 초기화 후 db에 저장
                    await user.save();

                    // 방 퇴장 유저 nickName 프론트로 전달
                    io.to(roomId).emit('roomLeft', nickName);

                    // 방 퇴장 후 남아있는 nickName 리스트 보내기
                    io.to(roomId).emit('roomJoined', data);
                    console.log('data =', data);

                    //방인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);
                    const roomList = await getRoomList(kategorieId);
                    await deleteEmptyRooms();

                    // // ip연결 정보 삭제
                    // const clientIP = socket.request.connection.remoteAddress;
                    // await connectedIPs.delete(clientIP);
                    // console.log(
                    //     '클라이언트가 연결을 종료했습니다. IP 주소:',
                    //     clientIP
                    // );

                    // console.log('connectedIPs=', connectedIPs);

                    // 네임스페이스에 룸리스트 보내기
                    io.of('/roomList')
                        .to(kategorieId)
                        .emit('update_roomList', roomList);
                });
            } catch (error) {
                console.error('배심원 참여 처리 실패:', error);
                socket.emit('error', '배심원 참여 처리에 실패했습니다.');
            }
        });

        //

        // 게임 시작
        socket.on('show_roulette', async (result, kategorieId, done) => {
            try {
                const roomId = socket.roomId;
                console.log('roomId =', roomId);

                const room = await Room.findOne({
                    where: { roomId },
                });

                // const kategorieId = room.kategorieId;
                // console.log('kategorieId =', kategorieId);

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

        socket.on('start_roulette', async (roomId, kategorieId, done) => {
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

                const roomList = await getRoomList(kategorieId);

                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);
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

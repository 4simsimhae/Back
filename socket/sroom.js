const { UserInfo, Room, User, Subject, Vote } = require('../models');
const socketRandomName = require('../middlewares/socketRandomName');
const socketCheckLogin = require('../middlewares/socketCheckLogin');
const socketRandomAvatar = require('../middlewares/socketRandomAvatar');
const socketRandomNickName = require('../middlewares/socketRandomNickName.js');

// // 중복 접속 방지
// const connectedIPs = new Set();

// 접속 유저 IP 체크
const ipCheckFunc = async (socket) => {
    const clientIP = socket.handshake.address;
    console.log('클라이언트가 접속했습니다. IP 주소:', clientIP);

    // 이미 접속된 IP 주소인지 확인
    if (connectedIPs.has(clientIP)) {
        console.log('이미 접속된 IP 주소입니다. 접속을 거부합니다.');
        socket.emit('error', '이미 접속된 IP 주소입니다.');
        socket.disconnect(true); // 클라이언트의 연결을 강제로 끊습니다.
        return;
    }

    // 접속 허용되었을 경우, 해당 IP 주소를 연결된 IP 주소 목록에 추가
    connectedIPs.add(clientIP);
    console.log('connectedIPs=', connectedIPs);
};

// 유저 IP 정보 삭제
const ipInfoDeleteFunc = async (socket) => {
    const clientIP = socket.request.connection.remoteAddress;
    await connectedIPs.delete(clientIP);
    console.log('클라이언트가 연결을 종료했습니다. IP 주소:', clientIP);

    console.log('connectedIPs=', connectedIPs);
};

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
        // 빈방 삭제
        deleteEmptyRooms();

        // // 접속 유저 IP 체크
        // ipCheckFunc();

        // 룸리스트 전달
        socket.on('update', async (kategorieId) => {
            try {
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

    // avatars,data 초기화
    const avatars = {};
    let data = [];

    // socket connection
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
        socket.on('joinDebate', async (roomId, kategorieId, done) => {
            try {
                // // ip check
                // ipCheckFunc();

                // socketCheckLogin 미들웨어
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

                if (!user) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                console.log('kakaoId=', user.user.kakaoId);
                if (user.user.kakaoId == 0) {
                    done('msg');
                    return;
                }

                // roomId 조회 후 room 생성
                const room = await Room.findOne({ where: { roomId } });

                if (!room) {
                    socket.emit('error', '입장할 수 있는 방이 없습니다.');
                    return;
                }

                if (!avatars[roomId]) {
                    avatars[roomId] = { avatars: [] };
                }

                if (!socket.locals) {
                    socket.locals = {};
                }

                // 랜덤 아바타 미들웨어
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

                // 랜덤 닉네임 미들웨어
                await new Promise((resolve) => {
                    socketRandomNickName(socket, async () => {
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

                        // 방장이 이미 있을시 host = 0, 방장이 없을시 host = 1
                        if (userExists) {
                            user.host = 0;
                        } else {
                            user.host = 1;
                        }

                        // userInfo save
                        user.save().then(() => {
                            done();

                            // userData 생성
                            const userData = {
                                nickName: user.nickName,
                                avatar: user.avatar,
                                host: user.host,
                                debater: user.debater,
                            };

                            // 방에 입장
                            socket.join(room.roomId);
                            socket.roomId = room.roomId;

                            // 유저 data List 만들기
                            data.push(userData);
                            console.log('userData =', data);

                            // 연결된 socket 전체에게 입장한 유저 data 보내기
                            io.to(roomId).emit('roomJoined', data);

                            resolve();
                        });
                    });
                });

                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                // roomList 갱신
                const roomList = await getRoomList(kategorieId);

                // 룸리스트 네임스페이스로 전달
                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                // 방 나가기
                socket.on('leave_room', async (done) => {
                    const nickName = socket.nickName;

                    // 해당 닉네임을 가진 사용자 정보를 data 배열에서 제거
                    data = data.filter(
                        (userData) => userData.nickName !== nickName
                    );

                    // 유저정보 초기화
                    user.host = 0;
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;

                    // user 정보 초기화 후 db에 저장
                    await user.save();

                    // 방 퇴장 유저 nickName 프론트로 전달
                    io.to(roomId).emit('roomLeft', nickName);

                    // 방 퇴장 후 남아있는 userData 보내기
                    io.to(roomId).emit('roomJoined', data);
                    console.log('data =', data);

                    // 방 인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);

                    // 빈방 삭제
                    await deleteEmptyRooms();

                    // 룸리스트 갱신
                    const roomList = await getRoomList(kategorieId);

                    // 네임스페이스에 룸리스트 보내기
                    io.of('/roomList')
                        .to(kategorieId)
                        .emit('update_roomList', roomList);

                    done();

                    // 소켓 연결 끊기
                    socket.disconnect();
                });

                // socket disconnecting
                socket.on('disconnecting', async () => {
                    const nickName = socket.nickName;

                    // 해당 닉네임을 가진 사용자 정보를 data 배열에서 제거
                    data = data.filter(
                        (userData) => userData.nickName !== nickName
                    );

                    // 유저정보 초기화
                    user.host = 0;
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;

                    await user.save();

                    // // 유저 IP 정보 삭제
                    // ipInfoDeleteFunc();
                });
            } catch (error) {
                console.error('토론자 참여 처리 실패:', error);
                socket.emit('error', '토론자 참여 처리에 실패했습니다.');
            }
        });

        // 배심원으로 참가하기
        socket.on('joinJuror', async (roomId, kategorieId, done) => {
            try {
                // // ip check
                // ipCheckFunc();

                // socketCheckLogin 미들웨어
                await socketCheckLogin(socket, (err) => {
                    if (err) {
                        return done(err.message);
                    }
                });

                const user = await UserInfo.findOne({
                    where: { userId: socket.locals.user.userId },
                });
                console.log(user);

                if (!user) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                // roomId 조회 후 room 생성
                const room = await Room.findOne({ where: { roomId } });
                console.log(room);

                if (!room) {
                    socket.emit('error', '입장할 수 있는 방이 없습니다.');
                    return;
                }

                // 방에 입장
                socket.join(room.roomId);
                socket.roomId = room.roomId;

                if (!avatars[roomId]) {
                    avatars[roomId] = { avatars: [] };
                }

                if (!socket.locals) {
                    socket.locals = {};
                }

                // 랜덤 아바타 미들웨어
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

                // 랜덤 닉네임 미들웨어
                await new Promise((resolve) => {
                    socketRandomNickName(socket, () => {
                        const nickName = socket.locals.random;
                        socket.nickName = nickName;
                        user.host = 0;
                        user.debater = 0;
                        user.roomId = room.roomId;
                        user.nickName = nickName;

                        // userInfo save
                        user.save().then(() => {
                            done();

                            // userData 생성
                            const userData = {
                                nickName: user.nickName,
                                avatar: user.avatar,
                                host: user.host,
                                debater: user.debater,
                            };

                            // 유저 data List 만들기
                            data.push(userData);
                            console.log('userData =', data);

                            // 연결된 socket 전체에게 입장한 유저 data 보내기
                            io.to(roomId).emit('roomJoined', data);

                            resolve();
                        });
                    });
                });

                //방인원 체크후 db업데이트
                await updateRoomCount(room.roomId);

                // roomList 갱신
                const roomList = await getRoomList(kategorieId);

                // 룸리스트 네임스페이스로 전달
                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                // 방 나가기
                socket.on('leave_room', async (done) => {
                    const nickName = socket.nickName;

                    // 해당 닉네임을 가진 사용자 정보를 data 배열에서 제거
                    data = data.filter(
                        (userData) => userData.nickName !== nickName
                    );

                    // 유저정보 초기화
                    user.host = 0;
                    user.debater = 0;
                    user.like = 0;
                    user.hate = 0;
                    user.questionMark = 0;
                    user.roomId = 0;

                    // user 정보 초기화 후 db에 저장
                    await user.save();

                    // 방 퇴장 유저 nickName 프론트로 전달
                    io.to(roomId).emit('roomLeft', nickName);

                    // 방 퇴장 후 남아있는 userData 보내기
                    io.to(roomId).emit('roomJoined', data);
                    console.log('data =', data);

                    // 방 인원 체크후 db업데이트
                    await updateRoomCount(room.roomId);

                    // 빈방 삭제
                    await deleteEmptyRooms();

                    const roomList = await getRoomList(kategorieId);

                    // 네임스페이스에 룸리스트 보내기
                    io.of('/roomList')
                        .to(kategorieId)
                        .emit('update_roomList', roomList);

                    done();

                    // 소켓 연결 끊기
                    socket.disconnect();
                });

                // socket disconnecting
                socket.on('disconnecting', async () => {
                    const nickName = socket.nickName;

                    // 해당 닉네임을 가진 사용자 정보를 data 배열에서 제거
                    data = data.filter(
                        (userData) => userData.nickName !== nickName
                    );

                    // // 유저 IP 정보 삭제
                    // ipInfoDeleteFunc();
                });
            } catch (error) {
                console.error('배심원 참여 처리 실패:', error);
                socket.emit('error', '배심원 참여 처리에 실패했습니다.');
            }
        });

        // 게임 시작
        socket.on('show_roulette', async (result, kategorieId, done) => {
            try {
                // roomId 추출
                const roomId = socket.roomId;
                console.log('roomId =', roomId);

                // 추출한 roomId로 room 생성
                const room = await Room.findOne({
                    where: { roomId },
                });

                // kategorieId로 해당 카테고리의 주제리스트 가져오기
                const subjectList = await Subject.findOne({
                    where: { kategorieId },
                    attributes: ['subjectList'],
                });
                console.log('subjectList=', subjectList);

                // subjectList JSON 형태로 파싱
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

        let debater1Count = 0;
        let debater2Count = 0;

        socket.on('vote', async (roomId, host) => {
            try {
                // 룸 정의
                const room = await Room.findOne({
                    where: { roomId },
                });

                //투표 인원 체크
                const panelCount = room.panel;
                console.log('배심원수 = ', panelCount);

                // 1번 토론자 조회
                const debaterUser1 = await UserInfo.findOne({
                    where: { roomId, host: 1, debater: 1 },
                });

                // 2번 토론자 조회
                const debaterUser2 = await UserInfo.findOne({
                    where: { roomId, host: 0, debater: 1 },
                });

                console.log('토론자1', debaterUser1.nickName);
                console.log('토론자2', debaterUser2.nickName);

                // 데이터베이스에서 Vote 레코드를 조회하거나 생성
                let voteRecord = await Vote.findOne({ where: { roomId } });
                if (!voteRecord) {
                    voteRecord = await Vote.create({
                        roomId,
                        debater1Count: 0,
                        debater2Count: 0,
                    });
                }

                // 전달받은 host값이 1이면 1번토론자 투표수 증가 , 0이면 2번토론자 투표수 증가
                if (host === 1) {
                    await voteRecord.increment('debater1Count');
                } else if (host === 0) {
                    await voteRecord.increment('debater2Count');
                }

                // 투표 수 가져오기
                await voteRecord.reload();
                const voteCount =
                    voteRecord.debater1Count + voteRecord.debater2Count;
                console.log('투표수', voteCount);

                if (voteCount == panelCount) {
                    console.log('투표종료');

                    let winner;
                    let loser;
                    let winnerCount;
                    let loserCount;

                    if (voteRecord.debater1Count > voteRecord.debater2Count) {
                        winner = debaterUser1;
                        winnerCount = voteRecord.debater1Count;
                        loser = debaterUser2;
                        loserCount = voteRecord.debater2Count;
                    } else {
                        winner = debaterUser2.nickName;
                        winnerCount = voteRecord.debater2Count;
                        loser = debaterUser1.nickName;
                        loserCount = voteRecord.debater1Count;
                    }

                    const voteResult = `우승자는 ${winnerCount}표를 받은 ${winner.nickName}입니다. 패자는 ${loserCount}표를 받은 ${loser.nickName}입니다.`;
                    console.log(voteResult);
                    io.to(roomId).emit(
                        'voteResult',
                        winner,
                        winnerCount,
                        loser,
                        loserCount
                    );

                    // 투표 종료 후 데이터 보내주고 voteCount 초기화
                    voteRecord.debater1Count = 0;
                    voteRecord.debater2Count = 0;
                    await voteRecord.save();

                    // winner 정보 초기화
                    winner.like = 0;
                    winner.hate = 0;
                    winner.questionMark = 0;
                    winner.debater = 1;
                    winner.host = 1;
                    await winner.save();

                    // loser 정보 초기화
                    loser.like = 0;
                    loser.hate = 0;
                    loser.questionMark = 0;
                    loser.debater = 0;
                    loser.host = 0;
                    await loser.save();
                } else {
                    console.log('debater 에게 투표가 되었습니다.');
                }
            } catch (error) {
                console.error('투표 처리 실패:', error);
                socket.emit('error', '투표 처리에 실패했습니다.');
            }
        });
    });
};

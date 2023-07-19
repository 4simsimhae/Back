const { UserInfo, Room, User, Subject, Vote } = require('../models');
const {
    makeRandomAvatar,
    makeRandomNickName,
    getRandomDebaters,
    getRandomPosition,
} = require('./randomFunc.js');
const socketCheckLogin = require('../middlewares/socketCheckLogin');

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

//방인원 체크 : room의 debater, panel 업데이트
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

// 카테고리별 방리스트 조회
const getRoomList = async (kategorieId) => {
    const roomList = await Room.findAll({
        attributes: [
            'roomId',
            'KategorieName',
            'roomName',
            'debater',
            'panel',
            'gameStart',
        ],
        where: { kategorieId },
        order: [['createdAt', 'DESC']],
    });
    return roomList;
};

// Vote 테이블 data 삭제
const deleteVotes = async () => {
    try {
        // Vote 테이블에서 모든 데이터 조회
        const allVotes = await Vote.findAll();

        // Room 테이블에서 모든 roomId 조회
        const roomIds = await Room.findAll({
            attributes: ['roomId'],
        });

        // Room 테이블에 존재하는 roomId 목록 생성
        const existingRoomIds = roomIds.map((room) => room.roomId);

        // Room 테이블에 존재하지 않는 Vote 데이터 필터링
        const votesDelete = allVotes.filter(
            (vote) => !existingRoomIds.includes(vote.roomId)
        );

        // Vote 테이블에서 삭제할 데이터 삭제
        await Promise.all(votesDelete.map((vote) => vote.destroy()));

        console.log('Vote 데이터를 정리하였습니다.');
    } catch (error) {
        console.error('Vote 데이터 정리에 실패하였습니다.', error);
    }
};

module.exports = async (io) => {
    io.of('/roomList').on('connection', (socket) => {
        // 빈방 삭제
        deleteEmptyRooms();
        deleteVotes();

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

    // 삭제 예정
    let data = [];

    // socket connection
    io.on('connection', (socket) => {
        // 토론자로 참여하기
        socket.on('joinDebate', async (roomId, kategorieId, done) => {
            try {
                /* ip check
                    ipCheckFunc();
                */
                socket.kategorieId = kategorieId;

                // socketCheckLogin 미들웨어 : DB에 존재하는 유저인지 확인
                await socketCheckLogin(socket, (err) => {
                    if (err) {
                        return done(err.message);
                    }
                });

                // 유저 확인을 위해 사용
                const userInfo = await UserInfo.findOne({
                    where: { userId: socket.user.userId },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['kakaoId'],
                        },
                    ],
                });

                if (!userInfo) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                // 방이 현재 존재하는지 확인
                const room = await Room.findOne({ where: { roomId } });

                if (!room) {
                    socket.emit('error', '입장할 수 있는 방이 없습니다.');
                    return;
                }

                socket.roomId = roomId;

                // 새로고침 시 동일한 데이터 보여주기 위함임
                if (userInfo.afterRoomId === roomId) {
                    socket.nickName = userInfo.nickName;
                    socket.avater = userInfo.abatar;
                } else {
                    /* 랜덤 아바타 생성함수
                    1. socket.avatar에 랜덤 값 저장 - 객체 형태
                */
                    await makeRandomAvatar(socket);

                    /* 랜덤 닉네임 생성함수
                    1. socket.nickName에 랜덤 값 저장 
                */
                    await makeRandomNickName(socket);
                }

                // 토론자로 입장 시 최종 업데이트되는 값
                await UserInfo.update(
                    {
                        debater: 1,
                        roomId: socket.roomId,
                        afterRoomId: socket.roomId,
                        avatar: socket.avatar,
                        nickName: socket.nickName,
                    },
                    {
                        where: { userId: socket.user.userId },
                    }
                );

                /*                //방장 권한 주기
                const hostExists = await UserInfo.findOne({
                    where: {
                        roomId,
                        host: 1,
                    },
                });

                console.log('호스트 존재', hostExists);

                // 방장이 이미 있을시 host = 0, 방장이 없을시 host = 1
                if (hostExists) {
                    await UserInfo.update(
                        { host: 0 },
                        {
                            where: { userId: socket.user.userId },
                        }
                    );
                } else {
                    await UserInfo.update(
                        { host: 1 },
                        {
                            where: { userId: socket.user.userId },
                        }
                    );
                } */

                socket.join(roomId);
                console.log('소켓 방 입장', socket.adapter.rooms);

                const userListOnDB = await UserInfo.findAll({
                    attributes: [
                        'userId',
                        'nickName',
                        'avatar',
                        'host',
                        'debater',
                    ],
                    where: { roomId: socket.roomId },
                });

                console.log('방 입장 유저리스트 (DB)', userListOnDB);

                const userList = await userListOnDB.map((user) => {
                    return {
                        userId: user.userId,
                        nickName: user.nickName,
                        avatar: user.avatar,
                        host: user.host,
                        debater: user.debater,
                    };
                });

                console.log('방 입장 유저리스트', userList);

                // 연결된 socket 전체에게 입장한 유저 data 보내기
                io.to(roomId).emit('roomJoined', userList);

                //방인원 체크후 db업데이트 : room의 debater, panel 업데이트
                await updateRoomCount(roomId);

                // roomList 갱신
                const roomList = await getRoomList(kategorieId);
                console.log('방 입장 룸리스트', roomList);

                // 룸리스트 네임스페이스로 전달
                await io
                    .of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);
                done();

                // 방 나가기 : 토론자 및 방장이 정상적인 루트로 나갔을 시 적용
                socket.on('leave_room', async (done) => {
                    done();
                    socket.on('disconnecting', () => {
                        io.to(roomId).emit('roomLeft', socket.nickName);
                    });
                });

                // socket disconnecting : 토론자 및 방장이 정상적인 루트로 나가지 않았을 시 작동되어야 할 부분
                socket.on('disconnecting', async () => {
                    console.log('2. joinDebate disconnecting');

                    // 현재 DB 내 방 정보
                    const room = await Room.findOne({
                        where: {
                            roomId: socket.roomId,
                        },
                    });

                    const myUserInfo = await UserInfo.findOne({
                        where: {
                            userId: socket.user.userId,
                        },
                    });

                    // 로직 진행
                    // Logic 1. 게임 종료 : 게임 시작 후 발언자가 나갈 경우
                    // gameStart 변경
                    if (room.gameStart === 1) {
                        await Room.update(
                            {
                                gameStart: 0,
                            },
                            { where: { roomId: socket.roomId } }
                        );
                        io.to(socket.roomId).emit('gameEnd');
                    }

                    // Logic 2. 방장 넘기기 : 방장 나갔을 때 넘겨줄 유저 잇는 경우
                    if (myUserInfo.host === 1) {
                        // 새로운 방장
                        const newHost = await UserInfo.findOne({
                            attributes: ['userId'],
                            where: {
                                roomId: socket.roomId,
                                debater: 1,
                                host: 0,
                            },
                        });
                        if (newHost) {
                            await UserInfo.update(
                                {
                                    host: 1,
                                },
                                {
                                    where: { userId: newHost.userId },
                                }
                            );
                            // io.to(socket.roomId).emit(
                            //     'changeHost',
                            //     newHost.userId
                            // );
                            console.log('2 - 1 - 1. 호스트 변경 (완료) ');
                        }
                    }

                    await UserInfo.update(
                        {
                            host: 0,
                            debater: 0,
                            roomId: 0,
                        },
                        {
                            where: { userId: socket.user.userId },
                        }
                    );

                    const userListOnDB = await UserInfo.findAll({
                        attributes: [
                            'userId',
                            'nickName',
                            'avatar',
                            'host',
                            'debater',
                        ],
                        where: { roomId: socket.roomId },
                    });

                    const userList = await userListOnDB.map((user) => {
                        return {
                            userId: user.userId,
                            nickName: user.nickName,
                            avatar: user.avatar,
                            host: user.host,
                            debater: user.debater,
                        };
                    });

                    console.log('2. 디베이터 나간 후 유저 리스트', userList);

                    io.to(roomId).emit('roomJoined', userList);

                    // 2. 방 업데이트 : debater, panel
                    await updateRoomCount(roomId);

                    // 현재 DB 내 방 정보
                    const updatedRoom = await Room.findOne({
                        where: {
                            roomId,
                        },
                    });

                    if (updatedRoom && updatedRoom.debater === 0) {
                        console.log('2 - 2.  방 폭파');
                        const allSockets = io.sockets.sockets;
                        const socketsInRoom = Array.from(allSockets).filter(
                            ([_, socket]) => {
                                return socket.rooms.has(roomId);
                            }
                        );
                        console.log('2 - 3. 나갈 배심원 소켓', socketsInRoom);
                        socketsInRoom.forEach(async ([_, socket]) => {
                            const disconnectedUserId = socket.user.userId;
                            // 프론트로 데이터 전송
                            io.to(roomId).emit(
                                'userDisconnected',
                                disconnectedUserId
                            );
                            // socket.disconnect();
                            console.log(
                                '남아있던 배심원 Id',
                                disconnectedUserId
                            );
                        });
                    }

                    // 3. 방 삭제
                    await deleteEmptyRooms();

                    // 4. 모든 처리된 후 방 리스트 업데이트
                    const roomList = await getRoomList(socket.kategorieId);

                    // 5. 업데이트된 방 리스트 전달
                    io.of('/roomList')
                        .to(kategorieId)
                        .emit('update_roomList', roomList);
                    // --------------------------------------

                    /* userInfo.roomId = 0;
                    userInfo.like = 0;
                    userInfo.hate = 0;
                    // 무조건 debater 값은 0으로 초기화
                    userInfo.debater = 0;
                    userInfo.questionMark = 0;
                    userInfo.debaterPosition = 0;
                    await userInfo.save(); */
                });
            } catch (error) {
                console.error('토론자 참여 처리 실패:', error);
                socket.emit('error', '토론자 참여 처리에 실패했습니다.');
            }
        });

        //
        //
        //
        //
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

                socket.kategorieId = kategorieId;

                const userInfo = await UserInfo.findOne({
                    where: { userId: socket.user.userId },
                });

                if (!userInfo) {
                    socket.emit('error', '유저를 찾을 수 없습니다.');
                    return;
                }

                // roomId 조회 후 room 생성
                const room = await Room.findOne({ where: { roomId } });

                if (!room) {
                    socket.emit('error', '입장할 수 있는 방이 없습니다.');
                    return;
                }

                // 방에 입장
                socket.roomId = roomId;

                // 기존 아바타와 닉네임 유지
                if (userInfo.afterRoomId === roomId) {
                    console.log('3. 아바타 유지');
                    socket.nickName = userInfo.nickName;
                    socket.avatar = userInfo.avatar;
                } else {
                    console.log('3. 아바타 변경');
                    // 랜덤 아바타 미들웨어
                    await makeRandomAvatar(socket);

                    // 랜덤 닉네임 미들웨어

                    await makeRandomNickName(socket);
                }

                await UserInfo.update(
                    {
                        avatar: socket.avatar,
                        nickName: socket.nickName,
                        roomId,
                        afterRoomId: roomId,
                    },
                    {
                        where: {
                            userId: socket.user.userId,
                        },
                    }
                );
                /*                 userInfo.debater = 0;
                userInfo.roomId = roomId;
                userInfo.afterRoomId = roomId;

                userInfo save
                await userInfo.save().then(() => {
                    done();

                    // userData 생성
                    if (data.length === 0) {
                        const userData = {
                            userId: userInfo.userId,
                            nickName: userInfo.nickName,
                            avatar: userInfo.avatar,
                            host: userInfo.host,
                            debater: userInfo.debater,
                        };
                        data.push(userData);
                        console.log('없을 때 만들어지는 data', data);
                    } else {
                        let count = 0;
                        data.map((item) => {
                            if (item.userId === userInfo.userId) {
                                item.userId = userInfo.userId;
                                item.nickName = userInfo.nickName;
                                item.avatar = userInfo.avatar;
                                item.host = userInfo.host;
                                item.debater = userInfo.debater;
                                console.log('동일한 Id 존재');
                            } else if (count === 0) {
                                const userData = {
                                    userId: userInfo.userId,
                                    nickName: userInfo.nickName,
                                    avatar: userInfo.avatar,
                                    host: userInfo.host,
                                    debater: userInfo.debater,
                                };
                                data.push(userData);
                                count += 1;
                                console.log(
                                    '동일한 Id가 없을 때 만들어지는 Data',
                                    data
                                );
                            }
                        });
                    } */

                socket.join(roomId);
                console.log('배심원 입장', socket.adapter.rooms);

                const userListOnDB = await UserInfo.findAll({
                    attributes: [
                        'userId',
                        'nickName',
                        'avatar',
                        'host',
                        'debater',
                    ],
                    where: { roomId: socket.roomId },
                });

                console.log('방 입장 유저리스트 (DB)', userListOnDB);

                const userList = await userListOnDB.map((user) => {
                    return {
                        userId: user.userId,
                        nickName: user.nickName,
                        avatar: user.avatar,
                        host: user.host,
                        debater: user.debater,
                    };
                });

                console.log('방 입장 유저리스트', userList);

                // console.log('data =', data);
                // 연결된 socket 전체에게 입장한 유저 data 보내기
                io.to(roomId).emit('roomJoined', userList);

                //방인원 체크후 db업데이트
                await updateRoomCount(roomId);

                // roomList 갱신
                const roomList = await getRoomList(kategorieId);

                // 룸리스트 네임스페이스로 전달
                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                done();
                // 방 나가기
                socket.on('leave_room', async (done) => {
                    done();
                    socket.on('disconnecting', () => {
                        io.to(roomId).emit('roomLeft', socket.nickName);
                    });
                });

                // socket disconnecting
                socket.on('disconnecting', async () => {
                    console.log('3. joinJurror disconnecting');

                    // 방 퇴장 유저 nickName 프론트로 전달
                    if (userInfo.afterRoomId !== roomId) {
                        io.to(roomId).emit('roomLeft', socket.nickName);
                    }

                    // data = data.filter(
                    //     (item) => item.userId !== socket.user.userId
                    // );

                    // // 방 퇴장 후 남아있는 userData 보내기
                    // io.to(roomId).emit('roomJoined', data);

                    await UserInfo.update(
                        {
                            roomId: 0,
                        },
                        {
                            where: {
                                userId: socket.user.userId,
                            },
                        }
                    );

                    const userListOnDB = await UserInfo.findAll({
                        attributes: [
                            'userId',
                            'nickName',
                            'avatar',
                            'host',
                            'debater',
                        ],
                        where: { roomId: socket.roomId },
                    });

                    const userList = await userListOnDB.map((user) => {
                        return {
                            userId: user.userId,
                            nickName: user.nickName,
                            avatar: user.avatar,
                            host: user.host,
                            debater: user.debater,
                        };
                    });

                    console.log('3. 배심원 나간 후 유저 리스트', userList);

                    io.to(socket.roomId).emit('roomJoined', userList);

                    // 방 인원 체크후 db업데이트
                    await updateRoomCount(socket.roomId);

                    // 빈방 삭제
                    await deleteEmptyRooms();

                    const roomList = await getRoomList(socket.kategorieId);

                    // 네임스페이스에 룸리스트 보내기
                    io.of('/roomList')
                        .to(socket.kategorieId)
                        .emit('update_roomList', roomList);
                });
            } catch (error) {
                console.error('배심원 참여 처리 실패:', error);
                socket.emit('error', '배심원 참여 처리에 실패했습니다.');
            }
        });

        // 게임 시작
        socket.on('show_roulette', async (result, kategorieId) => {
            try {
                // roomId 추출
                const roomId = socket.roomId;
                // console.log('roomId =', roomId);

                // 추출한 roomId로 room 생성
                const room = await Room.findOne({
                    where: { roomId },
                });

                // kategorieId로 해당 카테고리의 주제리스트 가져오기
                const subjectList = await Subject.findOne({
                    where: { kategorieId },
                    attributes: ['subjectList'],
                });
                // console.log('subjectList=', subjectList);

                // subjectList JSON 형태로 파싱
                const allSubjects = JSON.parse(
                    subjectList.dataValues.subjectList
                );
                // console.log('allSubjects=', allSubjects);

                const randomSubject = room.randomSubjects || []; // 기존 값이 NULL인 경우 빈 배열로 초기화

                // 배열값을 랜덤으로 배치 후 제일 앞에 8개 선정
                const randomSubjectArr = getRandomSubjects(allSubjects, 8);
                console.log('randomSubjects=', randomSubjectArr);

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
            } catch (error) {
                console.error('주제 룰렛 실행 실패:', error);
                socket.emit('error', '주제 룰렛 실행에 실패했습니다.');
            }
        });

        function getRandomSubjects(subjects, count) {
            const shuffled = subjects.sort(() => 0.5 - Math.random()); // 배열을 랜덤하게 섞음
            return shuffled.slice(0, count); // 앞에서부터 count 개수만큼의 요소 반환
        }

        socket.on('start_roulette', async (roomId, kategorieId) => {
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
                // console.log('selectedSubject=', selectedSubject);

                await Room.update(
                    { roomName: selectedSubject, gameStart: 1 },
                    { where: { roomId } }
                );

                const updatedRoom = await Room.findOne({
                    where: { roomId },
                });
                console.log('roomName =', updatedRoom.roomName);

                const roomList = await getRoomList(kategorieId);

                await io
                    .of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                io.to(roomId).emit('start_roulette', randomSubjectIndex);
            } catch (error) {
                console.error('룰렛 실행 실패:', error);
                socket.emit('error', '룰렛 실행에 실패했습니다.');
            }
        });

        socket.on('close_result', async (result, roomId) => {
            io.to(roomId).emit('close_result', result);
        });

        socket.on('close_roulette', async (result, roomId, kategorieId) => {
            // 토론자 찬성, 반대 랜덤으로 선정
            // UserInfo 테이블에서 roomId과 debater가 1인 사용자 목록 조회
            const debaterList = await UserInfo.findAll({
                where: {
                    roomId,
                    debater: 1,
                },
            });

            // 랜덤으로 토론자 2명 선택
            const randomDebaters = getRandomDebaters(debaterList, 2);

            // 선택된 토론자에게 랜덤한 debatePosition 할당
            const positions = [0, 1];
            randomDebaters.forEach((debater) => {
                const randomPosition = getRandomPosition(positions);
                debater.debatePosition = randomPosition;
                debater.save();
            });

            // 게임상태 진행중으로 변경
            await Room.update({ gameStart: 1 }, { where: { roomId } });
            // 룸리스트 갱신
            const roomList = await getRoomList(kategorieId);

            // 네임스페이스에 룸리스트 보내기
            io.of('/roomList')
                .to(kategorieId)
                .emit('update_roomList', roomList);

            // 선택된 토론자의 정보를 프론트로 전달
            const debatersInfo = randomDebaters.map((debater) => ({
                userId: debater.userId,
                host: debater.host,
                debatePosition: debater.debatePosition,
            }));
            console.log('프론트 전달 data', debatersInfo);

            io.to(roomId).emit('close_roulette', result, debatersInfo);
        });

        let debater1Count = 0;
        let debater2Count = 0;

        // 투표 결과 확인하기
        const checkVoteFunc = async (
            roomId,
            kategorieId,
            voteRecord,
            debaterUser1,
            debaterUser2
        ) => {
            console.log('투표종료');

            let winner;
            let loser;
            let winnerCount;
            let loserCount;

            if (voteRecord.debater1Count === voteRecord.debater2Count) {
                console.log('뭐여 무승부여?');
                const voteResult = {
                    debater1: debaterUser1.userId,
                    debater1Count: voteRecord.debater1Count,
                    debater2: debaterUser2.userId,
                    debater2Count: voteRecord.debater2Count,
                };

                // socket으로 변경
                await socket.to(roomId).emit('voteResult', voteResult);

                console.log('(무승부)투표수 초기화', voteRecord.debater1Count);
                console.log('(무승부)투표수 초기화', voteRecord.debater2Count);

                // 투표 종료 후 room 상태 게임종료 로 업데이트
                await Room.update({ gameStart: 0 }, { where: { roomId } });

                const roomList = await getRoomList(kategorieId);

                // 네임스페이스에 룸리스트 보내기
                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                return;
            } else if (voteRecord.debater1Count > voteRecord.debater2Count) {
                console.log('방장이 이겼네');

                winner = debaterUser1;
                winnerCount = voteRecord.debater1Count;
                loser = debaterUser2;
                loserCount = voteRecord.debater2Count;
            } else {
                console.log('도전자가 이겼네');

                winner = debaterUser2;
                winnerCount = voteRecord.debater2Count;
                loser = debaterUser1;
                loserCount = voteRecord.debater1Count;
            }
            const voteResult = {
                winner: winner.userId,
                winnerNickName: winner.nickName,
                winnerCount: winnerCount,
                loser: loser.userId,
                loserCount: loserCount,
            };

            console.log('voteResult', voteResult);

            // socket으로 변경
            await socket.to(roomId).emit('voteResult', voteResult);

            // 투표 종료 후 room 상태 게임종료 로 업데이트
            await Room.update({ gameStart: 0 }, { where: { roomId } });

            console.log('(결과나옴)투표수 초기화', voteRecord.debater1Count);
            console.log('(결과나옴)투표수 초기화', voteRecord.debater2Count);
            console.log('승자 닉네임', winner.nickName);
            console.log('승자 디베이터', winner.debater);
            console.log('데이터 =', data);
            console.log('투표후', data);
            console.log('패배자Id', loser.userId);

            // loser 퇴장 시키기
            // 소켓 정보 가져오기
            const allSockets = io.sockets.sockets;

            // 소켓 배열에서 loserSocket 조회
            const loserSocket = Array.from(allSockets).find(([_, socket]) => {
                return (
                    socket.nickName === loser.nickName &&
                    socket.rooms.has(roomId)
                );
            });
            if (loserSocket) {
                const socket = loserSocket[1];
                // socket.leave(roomId);

                // data 배열에서 패배자 삭제
                socket.emit('loserExit', socket.user.userId);
                console.log('0');
            } else {
                console.log(`${loser.nickName}의 소켓을 찾을 수 없습니다.`);
            }
        };

        socket.on('vote', async (roomId, host) => {
            console.log('투표 시 받아온 호스트 값', host);

            // 데이터베이스에서 Vote 레코드를 조회하거나 생성
            const voteRecord = await Vote.findOne({ where: { roomId } });
            // if (!voteRecord) {
            //     voteRecord = await Vote.create({
            //         roomId,
            //         debater1Count: 0,
            //         debater2Count: 0,
            //     });
            // }
            console.log('순서대로 진행되는 지 확인');
            // 전달받은 host값이 1이면 1번토론자 투표수 증가 , 0이면 2번토론자 투표수 증가
            if (host === 1) {
                console.log('호스트 투표');
                await voteRecord.increment('debater1Count');
            } else if (host === 0) {
                console.log('도전자 투표');
                await voteRecord.increment('debater2Count');
            }
            // checkVoteEndFunc(roomId, kategorieId, voteRecord);
        });

        // 30초 이후에는 무조건 투표결과 보내기
        let timer = 30;
        socket.on('voteStart', async (roomId, kategorieId, done) => {
            let voteRecord = await Vote.findOne({ where: { roomId } });
            // 투표 종료 후 데이터 보내주고 voteCount 초기화
            voteRecord.debater1Count = 0;
            voteRecord.debater2Count = 0;

            await voteRecord.save();

            const room = await Room.findOne({
                where: { roomId },
            });

            const panelCount = room.panel;

            // 1번 토론자 조회
            const debaterUser1 = await UserInfo.findOne({
                where: { roomId, host: 1, debater: 1 },
                attributes: ['userId', 'nickName', 'debater'],
            });

            // 2번 토론자 조회
            const debaterUser2 = await UserInfo.findOne({
                where: { roomId, host: 0, debater: 1 },
                attributes: ['userId', 'nickName', 'debater'],
            });

            if (debaterUser1 && debaterUser2 && room.gameStart === 1) {
                const test = setInterval(async () => {
                    if (timer !== 0) {
                        await voteRecord.reload();

                        const voteCount =
                            voteRecord.debater1Count + voteRecord.debater2Count;

                        console.log('투표수', voteCount);

                        if (voteCount === panelCount) {
                            clearInterval(test);
                            timer = 30;
                            checkVoteFunc(
                                roomId,
                                kategorieId,
                                voteRecord,
                                debaterUser1,
                                debaterUser2
                            );
                            done();
                        } else {
                            timer -= 1;
                            console.log(timer);
                            // test
                            socket.emit('sendRemainTime', timer.toString());
                        }
                    } else {
                        clearInterval(test);
                        timer = 30;

                        checkVoteFunc(
                            roomId,
                            kategorieId,
                            voteRecord,
                            debaterUser1,
                            debaterUser2
                        );
                        done();
                    }
                }, 1000);
            }
        });

        // debater 수를 반환하는 함수
        const countDebaters = async (roomId) => {
            const debaterCount = await UserInfo.count({
                where: {
                    roomId: roomId,
                    debater: 1,
                },
            });
            return debaterCount;
        };

        socket.on('refresh', async () => {
            console.log(
                '*********************새로고침 받기*********************'
            );
        });

        // 모든 유저가 소켓 연결이 끊겼을 때 발생하는 부분
        socket.on('disconnecting', async () => {
            console.log('1. connection disconnecting');

            // joinDebater나 JoinJuror를 거쳤을 경우
            /*            if (socket.user) {
                const exitUserInfo = await UserInfo.findOne({
                    where: { userId: socket.user.userId },
                });

                // 현재 방의 토론자 인원 수 구하기
                const debaterUser = await countDebaters(socket.roomId);
                console.log('1. 남은 디바이터', debaterUser);

                // DB에서 현재 방의 gameStart 값 조회
                const room = await Room.findOne({
                    where: { roomId: socket.roomId },
                });

                console.log(
                    '1 - 1. 종료한 유저의 호스트 값 = ',
                    exitUserInfo.host
                );

                // 연결 해제된 유저 data에서 삭제
                data = data.filter(
                    (item) => item.userId !== socket.user.userId
                );

                // 위에서 업데이트한 data 전송
                console.log('1 - 2. 방인원 업데이트');
                io.to(socket.roomId).emit('roomJoined', data);

                // Case 2 : 게임이 시작되고 새로고침 시 강퇴

                if (room.gameStart === 1 && debaterUser === 1) {
                    console.log('/ 1. 게임중 나감');
                    // debater가 나갈 경우 gameStart 값을 0으로 변경
                    // debater가 아직 남아있는 경우
                    room.gameStart = 0;
                    await room.save();
                    io.to(socket.roomId).emit('gameEnd');
                    console.log(
                        '새로고침해서 나가는 유저Id',
                        socket.user.userId
                    );
                }

                // Case 1 : 방장인 경우 방장 권한 위임
                if (exitUserInfo.host === 1) {
                    console.log('/ 2. 방장 나감');
                    const newHost = await UserInfo.findOne({
                        where: {
                            roomId: socket.roomId,
                            host: 0,
                            debater: 1,
                        },
                    });

                    // 방장 이외의 토론자 존재
                    if (newHost) {
                        newHost.host = 1;
                        await newHost.save();
                        data.map((data) => {
                            if (data.userId === newHost.userId) {
                                data.host = 1;
                            }
                        });
                        io.to(socket.roomId).emit('changeHost', newHost.userId);
                    }
                    exitUserInfo.host = 0;
                    exitUserInfo.debater = 0;
                    await exitUserInfo.save();
                }

                // 방 인원 체크후 db업데이트
                await updateRoomCount(socket.roomId);

                // Case 3 : 토론자가 아무도 없을 경우 배심원 강퇴
                if (debaterUser === 0) {
                    // debater가 0명이 되면 방에 남아 있는 모든 소켓 내보내기
                    console.log('토론자 다 나갔냐?');
                    const allSockets = io.sockets.sockets;
                    const socketsInRoom = Array.from(allSockets).filter(
                        ([_, socket]) => {
                            return socket.rooms.has(socket.roomId);
                        }
                    );
                    socketsInRoom.forEach(async ([_, socket]) => {
                        const disconnectedUserId = socket.user.userId;
                        // 프론트로 데이터 전송
                        io.to(socket.roomId).emit(
                            'userDisconnected',
                            disconnectedUserId
                        );
                        // socket.disconnect();
                        console.log('남아있던 배심원 Id', disconnectedUserId);
                    });
                }
                // 빈방 삭제
                await deleteEmptyRooms();

                console.log('1 - 3. 방리스트 업데이트');

                const roomList = await getRoomList(socket.kategorieId);
                // 네임스페이스에 룸리스트 보내기
                io.of('/roomList')
                    .to(socket.kategorieId)
                    .emit('update_roomList', roomList);
                console.log('1 - 4. 방리스트 전송');
            } */
        });
    });
};

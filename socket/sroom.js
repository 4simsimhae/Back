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

    let data = [];

    // socket connection
    io.on('connection', (socket) => {
        // 토론자로 참여하기
        socket.on('joinDebate', async (roomId, kategorieId, done) => {
            try {
                /* ip check
                    ipCheckFunc();
                */
                // socketCheckLogin 미들웨어 : DB에 존재하는 유저인지 확인
                await socketCheckLogin(socket, (err) => {
                    if (err) {
                        return done(err.message);
                    }
                });

                socket.kategorieId = kategorieId;

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

                // console.log('유저 정보 = ', userInfo);

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

                socket.roomId = roomId;

                /* 랜덤 아바타 생성함수
                    1. socket.avatar에 랜덤 값 저장 - 객체 형태
                */
                await makeRandomAvatar(socket);

                /* 랜덤 닉네임 생성함수
                    1. socket.nickName에 랜덤 값 저장 
                */
                await makeRandomNickName(socket);

                //
                userInfo.avatar = JSON.stringify(socket.avatar);
                userInfo.debater = 1;
                userInfo.roomId = roomId;
                userInfo.nickName = socket.nickName;

                //방장 권한 주기
                const userExists = await UserInfo.findOne({
                    where: {
                        roomId,
                        host: 1,
                    },
                });

                // 방장이 이미 있을시 host = 0, 방장이 없을시 host = 1
                if (userExists) {
                    userInfo.host = 0;
                } else {
                    userInfo.host = 1;
                }

                // userInfo save
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
                    }

                    socket.join(roomId);

                    console.log('data =', data);

                    // 연결된 socket 전체에게 입장한 유저 data 보내기
                    io.to(roomId).emit('roomJoined', data);
                });

                //방인원 체크후 db업데이트
                await updateRoomCount(roomId);

                // roomList 갱신
                const roomList = await getRoomList(kategorieId);

                // 룸리스트 네임스페이스로 전달
                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                // 방 나가기
                socket.on('leave_room', async (done) => {
                    done();
                    socket.on('disconnecting', async () => {
                        console.log(
                            '4. joinDebate 내부 leave_room disconnecting'
                        );
                        // 나간 유저 정보 Data 배열에서 삭제
                        data = data.filter(
                            (userData) => userData.userId !== socket.user.userId
                        );

                        // 방 퇴장 유저 nickName 프론트로 전달
                        io.to(roomId).emit('roomLeft', socket.nickName);
                        // 방 퇴장 후 남아있는 userData 보내기
                        // io.to(roomId).emit('roomJoined', data);

                        // 방 인원 체크후 db업데이트
                        await updateRoomCount(roomId);

                        // 빈방 삭제
                        await deleteEmptyRooms();
                        await deleteVotes();

                        // 룸리스트 갱신
                        const roomList = await getRoomList(kategorieId);

                        // 네임스페이스에 룸리스트 보내기
                        io.of('/roomList')
                            .to(kategorieId)
                            .emit('update_roomList', roomList);
                        // // 유저 IP 정보 삭제
                        // ipInfoDeleteFunc();
                    });
                    // 소켓 연결 끊기
                    // socket.disconnect();
                });

                // socket disconnecting
                socket.on('disconnecting', async () => {
                    console.log('2. joinDebate disconnecting');
                    userInfo.roomId = 0;
                    userInfo.like = 0;
                    userInfo.hate = 0;
                    userInfo.debater = 0;
                    userInfo.questionMark = 0;
                    userInfo.debaterPosition = 0;
                    await userInfo.save();
                    // 나갈 유저정보 초기화
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

                // 랜덤 아바타 미들웨어
                await makeRandomAvatar(socket);

                // 랜덤 닉네임 미들웨어

                await makeRandomNickName(socket);

                userInfo.avatar = JSON.stringify(socket.avatar);
                userInfo.debater = 0;
                userInfo.roomId = roomId;
                userInfo.nickName = socket.nickName;

                // userInfo save
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
                    }

                    socket.join(roomId);

                    console.log('data =', data);
                    // 연결된 socket 전체에게 입장한 유저 data 보내기
                    io.to(roomId).emit('roomJoined', data);
                });

                //방인원 체크후 db업데이트
                await updateRoomCount(roomId);

                // roomList 갱신
                const roomList = await getRoomList(kategorieId);

                // 룸리스트 네임스페이스로 전달
                io.of('/roomList')
                    .to(kategorieId)
                    .emit('update_roomList', roomList);

                // 방 나가기
                socket.on('leave_room', async (done) => {
                    done();
                    socket.on('disconnecting', async () => {
                        console.log(
                            '5. joinJuror 내부 leave_room disconnecting'
                        );
                        // 해당 닉네임을 가진 사용자 정보를 data 배열에서 제거
                        data = data.filter(
                            (data) => data.userId !== userInfo.userId
                        );

                        // 유저정보 초기화
                        userInfo.roomId = 0;

                        // user 정보 초기화 후 db에 저장
                        await userInfo.save();

                        // 방 퇴장 유저 nickName 프론트로 전달
                        io.to(roomId).emit('roomLeft', socket.nickName);

                        // 방 퇴장 후 남아있는 userData 보내기
                        io.to(roomId).emit('roomJoined', data);
                        // console.log('data =', data);

                        // 방 인원 체크후 db업데이트
                        await updateRoomCount(roomId);

                        // 빈방 삭제
                        await deleteEmptyRooms();
                        await deleteVotes();

                        const roomList = await getRoomList(kategorieId);

                        // 네임스페이스에 룸리스트 보내기
                        io.of('/roomList')
                            .to(kategorieId)
                            .emit('update_roomList', roomList);
                        // console.log(
                        //     '방 나가기로 인해 정상적으로 소켓 연결이 끊겼습니다.'
                        // );
                    });
                });

                // socket disconnecting
                socket.on('disconnecting', async () => {
                    console.log('3. joinJurror disconnecting');
                    userInfo.roomId = 0;
                    userInfo.like = 0;
                    userInfo.hate = 0;
                    userInfo.questionMark = 0;
                    await userInfo.save();

                    // 방 인원 체크후 db업데이트
                    await updateRoomCount(socket.roomId);

                    // 빈방 삭제
                    await deleteEmptyRooms();
                    await deleteVotes();

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
                await socket.to(roomId).emit('voteResult', voteResult, () => {
                    socket.to(roomId).emit('roomJoined', data);
                });

                voteRecord.debater1Count = 0;
                voteRecord.debater2Count = 0;

                await voteRecord.save();

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

            console.log(
                '투표 결과',
                `우승자는 ${winnerCount}표를 받은 ${winner.nickName}입니다. 패자는 ${loserCount}표를 받은 ${loser.nickName}입니다.`
            );

            console.log('voteResult', voteResult);

            // socket으로 변경
            await socket.to(roomId).emit('voteResult', voteResult);

            // 투표 종료 후 데이터 보내주고 voteCount 초기화
            voteRecord.debater1Count = 0;
            voteRecord.debater2Count = 0;

            await voteRecord.save();

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
                socket.leave(roomId);

                // data 배열에서 패배자 삭제
                socket.emit('loserExit', socket.user.userId);
                console.log('0');
            } else {
                console.log(`${loser.nickName}의 소켓을 찾을 수 없습니다.`);
            }
        };

        /*  const checkVoteEndFunc = async (roomId, kategorieId, voteRecord) => {
            try {
                // 룸 정의
                const room = await Room.findOne({
                    where: { roomId },
                });
                // 투표 인원 체크
                const panelCount = room.panel;
                console.log('배심원수 = ', panelCount);
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
                console.log('토론자1', debaterUser1.nickName);
                console.log('토론자2', debaterUser2.nickName);

                // 투표 수 가져오기
                await voteRecord.reload();
                console.log(voteRecord);
                const voteCount =
                    voteRecord.debater1Count + voteRecord.debater2Count;
                console.log('투표수', voteCount);
                if (voteCount === panelCount) {
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

                        await io
                            .to(roomId)
                            .emit('voteResult', voteResult, () => {
                                io.to(roomId).emit('roomJoined', data);
                            });

                        voteRecord.debater1Count = 0;
                        voteRecord.debater2Count = 0;
                        await voteRecord.save();

                        console.log(
                            '(무승부)투표수 초기화',
                            voteRecord.debater1Count
                        );
                        console.log(
                            '(무승부)투표수 초기화',
                            voteRecord.debater2Count
                        );

                        // 투표 종료 후 room 상태 게임종료 로 업데이트
                        await Room.update(
                            { gameStart: 0 },
                            { where: { roomId } }
                        );

                        const roomList = await getRoomList(kategorieId);

                        // 네임스페이스에 룸리스트 보내기
                        io.of('/roomList')
                            .to(kategorieId)
                            .emit('update_roomList', roomList);

                        return;
                    } else if (
                        voteRecord.debater1Count > voteRecord.debater2Count
                    ) {
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
                    console.log(
                        '투표 결과',
                        `우승자는 ${winnerCount}표를 받은 ${winner.nickName}입니다. 패자는 ${loserCount}표를 받은 ${loser.nickName}입니다.`
                    );
                    console.log('voteResult', voteResult);
                    await io.to(roomId).emit('voteResult', voteResult);
                    // 투표 종료 후 데이터 보내주고 voteCount 초기화
                    voteRecord.debater1Count = 0;
                    voteRecord.debater2Count = 0;
                    await voteRecord.save();

                    // 투표 종료 후 room 상태 게임종료 로 업데이트
                    await Room.update({ gameStart: 0 }, { where: { roomId } });

                    console.log(
                        '(결과나옴)투표수 초기화',
                        voteRecord.debater1Count
                    );
                    console.log(
                        '(결과나옴)투표수 초기화',
                        voteRecord.debater2Count
                    );
                    console.log('승자 닉네임', winner.nickName);
                    console.log('승자 디베이터', winner.debater);
                    console.log('데이터 =', data);
                    console.log('투표후', data);
                    console.log('패배자Id', loser.userId);
                    // loser 퇴장 시키기
                    // 소켓 정보 가져오기
                    const allSockets = io.sockets.sockets;
                    // 소켓 배열에서 loserSocket 조회
                    const loserSocket = Array.from(allSockets).find(
                        ([_, socket]) => {
                            return (
                                socket.nickName === loser.nickName &&
                                socket.rooms.has(roomId)
                            );
                        }
                    );

                    if (loserSocket) {
                        const socket = loserSocket[1];
                        socket.leave(roomId);

                        // data 배열에서 패배자 삭제
                        socket.emit('loserExit', socket.user.userId);
                        console.log('0');
                    } else {
                        console.log(
                            `${loser.nickName}의 소켓을 찾을 수 없습니다.`
                        );
                    }
                } else {
                    console.log('debater 에게 투표가 되었습니다.');
                }
                socket.on('disconnecting', () => {
                    console.log('6. vote disconnecting');
                });
            } catch (error) {
                console.error('투표 처리 실패:', error);
                socket.emit('error', '투표 처리에 실패했습니다.');
            }
        }; */

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
        });

        socket.on('disconnecting', async () => {
            console.log('1. connection disconnecting');
            if (socket.user) {
                const exitUserInfo = await UserInfo.findOne({
                    where: { userId: socket.user.userId },
                });

                console.log('1. 종료한 유저의 호스트 값 = ', exitUserInfo.host);

                if (exitUserInfo.host === 1) {
                    const newHost = await UserInfo.findOne({
                        where: {
                            roomId: socket.roomId,
                            host: 0,
                            debater: 1,
                        },
                    });
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
                    await exitUserInfo.save();
                }

                data = data.filter(
                    (item) => item.userId !== socket.user.userId
                );

                // 방 퇴장 후 남아있는 userData 보내기
                if (socket.roomId) {
                    io.to(socket.roomId).emit('roomJoined', data);

                    // 방 인원 체크후 db업데이트
                    await updateRoomCount(socket.roomId);
                }
                // 빈방 삭제
                await deleteEmptyRooms();

                if (socket.kategorieId) {
                    const roomList = await getRoomList(socket.kategorieId);

                    // 네임스페이스에 룸리스트 보내기
                    io.of('/roomList')
                        .to(socket.kategorieId)
                        .emit('update_roomList', roomList);
                }
            }
        });
    });
};

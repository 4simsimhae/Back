const { UserInfo, Kategorie, Room, Subject, Chat } = require('../models');

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
                roomId: socket.roomId,
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
    socket.on('createRoom', async (userId, kategorieId) => {
        try {
            // 카테고리 정보 조회
            const kategorie = await Kategorie.findOne({
                where: { kategorieId },
            });

            if (!kategorie) {
                socket.emit('error', '카테고리를 찾을 수 없습니다.');
                return;
            }

            // 방 생성 로직 작성
            const room = await Room.create({
                kategorieName: kategorie.kategorieName,
                roomName: '',
                debater: 0,
                panel: 0,
                createdAt: new Date(),
            });

            // 클라이언트에게 정보 전달
            socket.emit('roomCreated', {
                userId,
                kategorieId: kategorie.kategorieId,
                kategorieName: kategorie.kategorieName,
                roomId: room.roomId,
                roomName: room.roomName,
            });
        } catch (error) {
            console.error('토론방 생성 실패:', error);
            socket.emit('error', '토론방 생성에 실패했습니다.');
        }
    });

    // 게임 시작
    socket.on('startGame', async () => {
        try {
            // 주제 랜덤으로 선택
            const subjects = await Subject.findAll({ limit: 8 }); // 8개의 주제를 랜덤으로 선택
            const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
            const selectedSubject = randomSubject.subjectList;

            // 토론방 제목 변경
            const room = await Room.findOne({ where: { roomId: socket.roomId } });
            room.roomName = selectedSubject;
            await room.save();

            // 클라이언트에 선택된 주제 정보 전달
            socket.emit('gameStarted', selectedSubject);
        } catch (error) {
            console.error('게임 시작 실패:', error);
            socket.emit('error', '게임 시작에 실패했습니다.');
        }
    });
};
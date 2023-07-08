const { UserInfo } = require('../models');

module.exports = (io) => {
    io.on('connection', (socket) => {
        socket.onAny((event) => {
            console.log(`Socket Event: ${event}`);
        });

        socket.on('like', async (roomId, userId) => {
            try {
                // userId 조회
                const debater = await UserInfo.findOne({
                    where: { roomId, userId, debater: 1 },
                });

                if (!debater) {
                    socket.emit(
                        'error',
                        '유저를 찾을 수 없거나 토론자가 아닙니다.'
                    );
                    return;
                }

                if (socket.userId === debater) {
                    socket.emit('error', '본인에게 좋아요를 누를수 없습니다.');
                    return;
                }

                // 좋아요 수 증가
                debater.like += 1;
                await debater.save();

                // 변경된 좋아요 정보를 클라이언트에게 전달
                socket.emit('likeUpdate', {
                    roomId,
                    userId,
                    like: debater.like,
                });
            } catch (error) {
                console.error('좋아요 처리 실패:', error);
                socket.emit('error', '좋아요 처리에 실패했습니다.');
            }
        });

        socket.on('hate', async (roomId, userId) => {
            try {
                // userId 조회
                const debater = await UserInfo.findOne({
                    where: { roomId, userId, debater: 1 },
                });

                if (!debater) {
                    socket.emit(
                        'error',
                        '유저를 찾을 수 없거나 토론자가 아닙니다.'
                    );
                    return;
                }

                // 싫어요 수 증가
                debater.hate += 1;
                await debater.save();

                // 변경된 싫어요 정보를 클라이언트에게 전달
                socket.emit('hateUpdate', {
                    roomId,
                    userId,
                    hate: debater.hate,
                });
            } catch (error) {
                console.error('싫어요 처리 실패:', error);
                socket.emit('error', '싫어요 처리에 실패했습니다.');
            }
        });

        socket.on('questionMark', async (roomId, userId) => {
            try {
                // userId 조회
                const debater = await UserInfo.findOne({
                    where: { roomId, userId, debater: 1 },
                });

                if (!debater) {
                    socket.emit(
                        'error',
                        '유저를 찾을 수 없거나 토론자가 아닙니다.'
                    );
                    return;
                }

                // 물음표 수 증가
                debater.questionMark += 1;
                await debater.save();

                // 변경된 물음표 정보를 클라이언트에게 전달
                socket.emit('questionMarkUpdate', {
                    roomId,
                    userId,
                    questionMark: debater.questionMark,
                });
            } catch (error) {
                console.error('? 처리 실패:', error);
                socket.emit('error', '? 처리에 실패했습니다.');
            }
        });
    });
};

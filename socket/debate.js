const { UserInfo } = require('../models');

module.exports = (io) => {
    io.on('connection', (socket) => {
        // socket.onAny((event) => {
        //     console.log(`Socket Event: ${event}`);
        // });

        socket.on('interaction', async (eventName, roomId, host) => {
            try {
                // host 값을 사용하여 사용자를 구분
                const debater = await UserInfo.findOne({
                    where: { roomId, host, debater: 1 },
                });

                if (!debater) {
                    socket.emit(
                        'error',
                        '유저를 찾을 수 없거나 토론자가 아닙니다.'
                    );
                    return;
                }

                switch (eventName) {
                    case 'like':
                        if (socket.userId === debater) {
                            socket.emit(
                                'error',
                                '본인에게 좋아요를 누를 수 없습니다.'
                            );
                            return;
                        }
                        // 좋아요 수 증가
                        debater.like += 1;
                        // 변경된 좋아요 정보를 클라이언트에게 전달
                        socket.emit('likeUpdate', {
                            roomId,
                            userId: debater.userId,
                            like: debater.like,
                        });
                        break;

                    case 'hate':
                        // 싫어요 수 증가
                        debater.hate += 1;
                        // 변경된 싫어요 정보를 클라이언트에게 전달
                        socket.emit('hateUpdate', {
                            roomId,
                            userId: debater.userId,
                            hate: debater.hate,
                        });
                        break;

                    case 'questionMark':
                        // 물음표 수 증가
                        debater.questionMark += 1;
                        // 변경된 물음표 정보를 클라이언트에게 전달
                        socket.emit('questionMarkUpdate', {
                            roomId,
                            userId: debater.userId,
                            questionMark: debater.questionMark,
                        });
                        break;

                    default:
                        socket.emit('error', '잘못된 이벤트명입니다.');
                        break;
                }

                await debater.save();
            } catch (error) {
                console.error('처리 실패:', error);
                socket.emit('error', '처리에 실패했습니다.');
            }
        });
    });
};

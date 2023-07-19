const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (socket, next) => {
    try {
        console.log('****** 소켓 체크 로그인 미들웨어 시작 ******');

        const Authorization = socket.handshake.query.token;
        const [authType, authToken] = Authorization.split(' ');
        const { userId } = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findOne({ where: { userId } });

        socket.user = user;

        console.log('****** 소켓 체크 로그인 미들웨어 확인 완료 ******');
        next(); // 다음 미들웨어 호출
    } catch (error) {
        console.error('로그인 체크 실패:', error);
        next(new Error('로그인이 필요한 서비스입니다.')); // 에러 처리
    }
};

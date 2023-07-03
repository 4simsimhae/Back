const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (socket, next) => {
    try {
        console.log('query=', socket.handshake.query);
        const Authorization = socket.handshake.query.token;
        console.log('받은 토큰 =', Authorization);

        socket.locals = {}; // 새로운 객체 생성
        socket.locals.user = {}; // user 객체 정의

        if (!Authorization) {
            console.log('토큰 없음 --------------');
            socket.locals.user = null;
        } else {
            console.log('토큰 있음 ------------------');

            const [authType, authToken] = Authorization.split(' ');
            console.log('Authorization =', authType, authToken);
            console.log('토큰 형식 ---------------');

            if (authType !== 'Bearer' || !authToken) {
                console.log('토큰 Bearer 타입 아님');
                socket.locals.user = null;
            } else {
                const { userId } = jwt.verify(
                    authToken,
                    process.env.JWT_SECRET
                );
                console.log('미들웨어 디코드한 유저 정보 =', userId);

                const user = await User.findOne({ where: { userId } });
                console.log('유저 정보를 소켓 로컬에 저장');
                socket.locals.user = user;

                console.log('넘기는유저아이디 =', socket.locals.user.userId);
            }
        }
        next(); // 다음 미들웨어 호출
    } catch (error) {
        console.error('로그인 체크 실패:', error);
        next(new Error('로그인이 필요한 서비스입니다.')); // 에러 처리
    }
};

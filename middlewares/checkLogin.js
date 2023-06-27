const jwt = require('jsonwebtoken');
const { User } = require('../models');

// 응답 객체
class ApiResponse {
    constructor(code, message = '', data = {}) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
}

// Express에서 사용하는 미들웨어 함수
module.exports = async (req, res, next) => {
    try {
        const Authorization = req.header('Authorization');
        // 토큰이 있는지 확인
        if (!Authorization) {
            res.locals.user = [];
        } else {
            console.log('읽어지나?');

            const [authType, authToken] = Authorization.split(' ');
            console.log(Authorization, authType, authToken);
            console.log('-----------');

            // authType === Bearer인지 확인
            if (authType !== 'Bearer' || !authToken) {
                console.log('토큰 Bearer 타입 아님');
                res.locals.user = [];
            } else {
                const { userId } = jwt.verify(
                    authToken,
                    process.env.JWT_SECRET
                );
                const user = await User.findOne({ where: { userId } });
                console.log('유저정보담아서보냄');

                res.locals.user = user;
            }
        }
        next();
    } catch (error) {
        const response = new ApiResponse(403, '로그인이 필요한 서비스입니다.');
        return res.status(403).json(response);
    }
};

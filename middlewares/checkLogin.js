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

module.exports = async (req, res, next) => {
    try {
        // const Authorization = req.header('Authorization');
        console.log('쿠키? = ',req.cookies)
        const Authorization = req.cookies('Authorization');
        //토큰이 있는지 확인
        if (!Authorization) {
            res.locals.user = [];
        } else {
            console.log("읽어지나?")
            const [authType, authToken] = Authorization.split(' ');
            console.log(Authorization, authType, authToken);

            //authTyep === Bearer인지 확인
            if (authType !== 'Bearer' || !authToken) {
                res.locals.user = [];
            } else {
                const { userId } = jwt.verify(
                    authToken,
                    process.env.JWT_SECRET
                );
                const user = await User.findOne({ where: { userId } });

                res.locals.user = user;
            }
        }
        next();
    } catch (error) {
        const response = new ApiResponse(403, '로그인이 필요한 서비스입니다.');
        return res.status(403).json(response);
    }
};

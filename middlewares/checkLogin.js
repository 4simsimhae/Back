const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
    try {
        const Authorization = req.header('Authorization');
        //토큰이 있는지 확인
        if (!Authorization) {
            const response = new ApiResponse(
                403,
                '로그인이 필요한 서비스입니다.'
            );
            return res.status(403).json(response);
        }

        const [authType, authToken] = Authorization.split(' ');
        console.log(Authorization, authType, authToken);

        //authTyep === Bearer인지 확인
        if (authType !== 'Bearer' || !authToken) {
            
            const response = new ApiResponse(
                403,
                '토큰 정보 오류'
            );
            return res.status(403).json(response);
        }

        //
        const { userId } = jwt.verify(authToken, process.env.JWT_SECRET);
        const user = await User.findOne({ where: { userId } });

        res.locals.user = user;
        next();
    } catch (error) {
        const response = new ApiResponse(
            403,
            '로그인이 필요한 서비스입니다.'
        );
        return res.status(403).json(response);
    }
};

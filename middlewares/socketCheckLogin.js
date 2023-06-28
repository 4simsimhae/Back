module.exports.socketCheckLogin = async (socket) => {
    try {
        console.log('socket token =', socket.handshake.query.token);
        const authorization = socket.handshake.query.token;
        // 토큰이 있는지 확인
        if (!authorization) {
            socket.user = null; // 로그인하지 않은 경우 user를 null로 설정합니다.
            console.log('로그인이 필요한 서비스입니다.');
            return;
        }

        const [authType, authToken] = authorization.split(' ');
        console.log('authorization =', authorization);
        console.log('authType =', authType);
        console.log('authToken =', authToken);
        console.log('authType === Bearer인지 확인:', authType === 'Bearer');
        console.log('auth1Token 존재 여부:', !!authToken);

        // authType === Bearer인지 확인
        if (authType !== 'Bearer' || !authToken) {
            socket.user = null;
            console.log('여기가 실행되는 거였냐?', socket.user);
            return;
        }

        const { userId } = jwt.verify(authToken, process.env.JWT_SECRET);
        console.log('userId =', userId);

        // 나머지 로직 수행
        const user = await User.findOne({ where: { userId } });
        socket.user = user;
        console.log('socket.user =', socket.user);
    } catch (error) {
        console.error('로그인 실패:', error);
    }
};

const axios = require('axios');

module.exports = async (socket, next) => {
    try {
        const html = await axios.get(
            'https://nickname.hwanmoo.kr/?format=json&count=2'
        );
        const newNickName = html.data.words[0];
        const splitname = newNickName.split(' ');
        const nickName = splitname[splitname.length - 1];
        console.log('nickName = ', nickName);
        console.log('-------------');
        if (!socket.locals) {
            socket.locals = {};
        }
        console.log('43 =', socket.locals.random);
        socket.locals.random = nickName;
        console.log('44 =', socket.locals.random);
        next();
    } catch (error) {
        console.error('닉네임 부여 실패:', error);
        socket.request.emit('error', '닉네임 부여에 실패했습니다.');
    }
};

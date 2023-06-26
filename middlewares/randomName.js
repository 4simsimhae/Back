const axios = require('axios');
const cheerio = require('cheerio');

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
        const html = await axios.get(
            'https://nickname.hwanmoo.kr/?format=json&count=2'
        );
        const name = html.data.words[0];
        console.log('name = ', name);
        console.log('-------------');
        res.locals.random = name;
        next();
    } catch (error) {
        return res.status(500).json({ errorMessage: '' });
    }
};

// 소켓 미들웨어
module.exports.socketRandomName = async (socket, next) => {
    try {
        const html = await axios.get(
            'https://nickname.hwanmoo.kr/?format=json&count=2'
        );
        const nickName = html.data.words[0];
        console.log('nickName = ', nickName);
        console.log('-------------');
        socket.locals = {};
        socket.locals.random = nickName;
        console.log('44 =', socket.locals.random);
        next();
    } catch (error) {
        console.error('닉네임 부여 실패:', error);
        socket.emit('error', '닉네임 부여에 실패했습니다.');
    }
};

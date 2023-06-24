// //랜덤 아이디 불러오기
// var Crawler = require('crawler')

// var c = new Crawler({
        //     maxConnections: 10,
        //     callback: function (error, res, done) {
        //         if (error) {
        //             console.log(error);
        //         } else {
        //             var $ = res.$;
        //             console.log($('title').text());
        //             const randomName = $('h1').text();
        //             done();
        //         }
        //     },
        // });
        // c.queue('https://nickname.hwanmoo.kr/');

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
        const html = await axios.get('https://nickname.hwanmoo.kr/?format=json&count=2');
        const name = html.data.words[0];
        console.log('name = ',name);
        console.log('-------------');
        res.locals.random = name;
        next();

    } catch (error) {
        return res
            .status(500)
            .json({ errorMessage: '' });
    }
};
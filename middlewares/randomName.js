//랜덤 아이디 불러오기
var Crawler = require('crawler')

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
        // var c = new Crawler({
        //     maxConnections: 10,
        //     callback: function (error, res, next) {
        //         if (error) {
        //             console.log(error);
        //         } else {
        //             var $ = res.$;
        //             console.log($('title').text());
        //             const randomName = $('h1').text();
        //             return res.json({ randomName });
                    
        //         }
        //     },
        // });
        // c.queue('https://nickname.hwanmoo.kr/');
        // res.locals.random = randomName;
        next();

    } catch (error) {
        return res
            .status(500)
            .json({ errorMessage: '' });
    }
};
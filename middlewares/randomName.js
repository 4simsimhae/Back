//랜덤 아이디 불러오기
var Crawler = require('crawler')

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
        //             const Name = $('h1').text();
        //         }
        //     },
        // });
        // c.queue('https://nickname.hwanmoo.kr/');
        
        // console.log('a = ', $('title').text());
        
        next();
    } catch (error) {
        return res
            .status(500)
            .json({ errorMessage: '' });
    }
};
require('dotenv').config(); //환경변수를 .env로 관리
const express = require('express');
const kakao = require('./passport/KakaoStrategy');
const cookieParser = require('cookie-parser');
const app = express();
const passport = require('passport');
const http = require("http");
const server = http.createServer(app);
const io = require("socket.io")(server);
const socketHandlers = require("./socket");

socketHandlers(io);

//swagger
const swaggerUi = require('swagger-ui-express'); // swagger
const swaggerDocs = require('./swagger.js');
/**
 *  @swagger
 *  tag :
 *      name:
 *      description :
 */

const indexRouter = require('./routes/index.js');
const session = require('express-session');
const authRouter = require('./routes/auth.js'); //URL 때문에 index에 안합치고 따로 빼서 구현 했어요!!

app.use(express.json());
app.use('/docs-api', swaggerUi.serve, swaggerUi.setup(swaggerDocs)); //스웨거 확인 api
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//CORS 설정
const cors = require('cors');
app.use(
    cors({
        origin: ['https://simsimhae.store', 'http://localhost:3000'],

        credentials: true,
    })
);

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            domain: 'http://localhost:3000',
            path: '/', // /로 설정하면 모든 페이지에서 쿠키를 사용할 수 있습니다.
            secure: false, // https가 아닌 환경에서도 사용할 수 있습니다.
            httpOnly: false, // 자바스크립트에서 쿠키를 확인할 수 있습니다.
        },
    })
);

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((token, done) => {
    done(null, token);
});

passport.deserializeUser((token, done) => {
    try {
        // 토큰을 이용하여 사용자를 인증 또는 사용자 정보를 가져오는 로직 구현
        // 예시: 토큰에서 userId를 추출하여 사용자 정보를 가져옴
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        Users.findByPk(userId)
            .then((user) => {
                done(null, user); // 사용자 객체를 세션에서 가져옴
            })
            .catch((err) => {
                done(err);
            });
    } catch {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

kakao(); // kakaoStrategy.js의 module.exports를 실행합니다.



app.use('/', authRouter);
app.use('/api', [indexRouter]);

app.get('/', (req, res) => {
    res.status(200).send('simsimhae API / Use "/docs-api" Page');
});

app.listen(3000, () => {
    console.log('3000 포트로 서버 연결');
}); //

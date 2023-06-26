require('dotenv').config();
const express = require('express');
const kakao = require('./passport/KakaoStrategy');
const cookieParser = require('cookie-parser');
const app = express();
const passport = require('passport');
const http = require('http');
const server = http.createServer(app);//

//swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swagger.js');

const indexRouter = require('./routes/index.js');
const session = require('express-session');
const authRouter = require('./routes/auth.js');

app.use(express.json());
app.use('/docs-api', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//CORS 설정
const cors = require('cors');
app.use(
    cors({
<<<<<<< HEAD
        origin: ['https://simsimhae.store', 'http://localhost:3000/'],
=======
        origin: ['https://simsimhae.store', 'http://localhost:3000'],
>>>>>>> 552cb9582f2d5148905d75cf58a66ce09e76e06e
        credentials: true,
    })
);

const io = require('socket.io')(server, {
    cors: {
        origin: ['https://simsimhae.store', 'http://localhost:3000'],
        credentials: true,
    },
});

const socketHandlers = require('./socket');

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
<<<<<<< HEAD
            domain: 'http://localhost:3000/', // .ysizuku.com으로 설정하면 모든 서브도메인에서 쿠키를 사용할 수 있습니다.
            path: '/', // /로 설정하면 모든 페이지에서 쿠키를 사용할 수 있습니다.
            secure: false, // https가 아닌 환경에서도 사용할 수 있습니다.
            httpOnly: false, // 자바스크립트에서 쿠키를 확인할 수 있습니다.
=======
            domain: 'http://localhost:3000',
            path: '/',
            secure: false,
            httpOnly: false,
>>>>>>> 552cb9582f2d5148905d75cf58a66ce09e76e06e
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;

        Users.findByPk(userId)
            .then((user) => {
                done(null, user);
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

kakao();

app.use('/', authRouter);
app.use('/api', [indexRouter]);

app.get('/', (req, res) => {
    res.status(200).send('simsimhae API / Use "/docs-api" Page');
});

socketHandlers(io);

server.listen(3000, () => {
    console.log('3000 포트로 서버 연결');
});

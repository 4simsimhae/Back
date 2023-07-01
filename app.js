require('dotenv').config();
const express = require('express');
const kakao = require('./passport/KakaoStrategy');
const cookieParser = require('cookie-parser');
const app = express();
const passport = require('passport');
const http = require('http');
const server = http.createServer(app); //
var cron = require('node-cron');
const { Kategorie, Subject } = require('./models');

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
        origin: [
            'https://simsimhae.store',
            'http://localhost:3000',
            'https://front-black-delta.vercel.app',
        ],
        credentials: true,
    })
);

const io = require('socket.io')(server, {
    cors: {
        origin: [
            'https://simsimhae.store',
            'http://localhost:3000',
            'https://front-black-delta.vercel.app',
        ],
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
            // domain: 'http://localhost:3000',
            domain: 'https://front-black-delta.vercel.app',
            path: '/',
            secure: false,
            httpOnly: false,
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


// 매일 자정에 chatGPT를 이용하여 새로운 주제 받기
// 요일 이름과 id값을 저장한 배열
const days = [
    { id: 1, name: "Mon", toMinus: 7 },
    { id: 2, name: "Tue", toMinus: 1 },
    { id: 3, name: "Wed", toMinus: 2 },
    { id: 4, name: "Thu", toMinus: 3 },
    { id: 5, name: "Fri", toMinus: 4 },
    { id: 6, name: "Sat", toMinus: 5 },
    { id: 7, name: "Sun", toMinus: 6 },
];
// second minute hour day-of-month month day-of-week
days.forEach((day) => {
    cron.schedule(`0 0 0 * * ${day.name}`, async () => {
        try {
            const list = [1, 2, 3, 4, 5, 6, 7, 8]
            for (const data of list){
                const kategorieId  = data;
                const { kategorieName } = await Kategorie.findOne({
                attributes: ['kategorieName'],
                    where: { kategorieId },
                });

                //GPT에 질문하기
                var [ kategorieName1, kategorieName2] = kategorieName.split('/');
                if (!kategorieName2){
                    kategorieName2 = ' ';
                }
                const { ask } = {
                    ask: `${kategorieName1} 혹은 ${kategorieName2} 카테고리에 대한 황당하고 엽기스러운 VS 형식의 토론 주제 100가지를 숫자 없이 큰따옴표 안에 주제만 적어서 배열 형식으로 새로 나열해줘.`,
                };

                const reply = await callChatGPT([{ role: 'user', content: ask }]);
                console.log(reply.content);

                const subjectList = reply.content //+ subject.subjectList;
                await Subject.update(
                    {
                        subjectList,
                        updatedAt: new Date(),
                    },
                    {
                        where: { kategorieId },
                    }
                );
            } 
        } catch (err) {
            console.error(err);
        }
    });
});
require('dotenv').config();//
const express = require('express');
const kakao = require('./passport/KakaoStrategy');
const cookieParser = require('cookie-parser');
const app = express();
const passport = require('passport');
const https = require('httpolyglot');
const fs = require('fs');
// const http = require('http');
// const server = http.createServer(app);
var cron = require('node-cron');
const { Kategorie, Subject } = require('./models');
var OpenVidu = require('openvidu-node-client').OpenVidu;
var OPENVIDU_URL = process.env.OPENVIDU_URL;
var OPENVIDU_SECRET = process.env.OPENVIDU_SECRET || 'MY_SECRET';
var openvidu = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
var bodyParser = require("body-parser");

const SERVER_PORT = 3000;

const path = require('path');
const _dirname = path.resolve()
const mediasoup = require('mediasoup');

//swagger
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swagger.js');

const indexRouter = require('./routes/index.js');
const session = require('express-session');
const authRouter = require('./routes/auth.js');
// const mediasoupRouter = require('./mediasoup/mediasoup.js');

app.use(express.json());
app.use('/docs-api', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//정적파일 미들웨어 (public폴더)
app.use('/sfu/:room', express.static(path.join(_dirname, 'public')))

// SSL cert for HTTPS access
const options = {
    key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
    cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8')
    }

    
    const httpsServer = https.createServer(options, app)
    httpsServer.listen(SERVER_PORT, () => {
        console.log('listening on port: ' + SERVER_PORT)
    })
    

//CORS 설정
const cors = require('cors');
app.use(
    cors({
        origin: [
            'https://simsimhae.store',
            'http://localhost:3000',
            'https://front-black-delta.vercel.app',
            'https://testmedia.vercel.app',
            'https://test23-xi.vercel.app',
        ],
        credentials: true,
    })
);

const io = require('socket.io')(httpsServer, {
    cors: {
        origin: [
            'https://simsimhae.store',
            'http://localhost:3000',
            'https://front-black-delta.vercel.app',
            'https://testmedia.vercel.app',
            'https://test23-xi.vercel.app',
        ],
        credentials: true,
    },
    ipv6: false,
});

const socketHandlers = require('./socket');
const mediasoupRouter = require('./mediasoup/mediasoup.js')

let domain
if (process.platform === "linux") {
    domain = 'https://front-black-delta.vercel.app'
} else {
    domain = 'https://test23-xi.vercel.app'
}

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: {
            domain: domain,
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
// app.use('/sfu', mediasoupRouter);

app.get('/', (req, res) => {
    res.status(200).send('simsimhae API / Use "/docs-api" Page');
});


//openvidu
// Allow application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
// Allow application/json
app.use(bodyParser.json());

// Serve static resources if available
app.use(express.static(__dirname + '/public'));

// Serve application
server.listen(SERVER_PORT, () => {
    console.log("Application started on port: ", SERVER_PORT);
    console.warn('Application server connecting to OpenVidu at ' + OPENVIDU_URL);
});

app.post('/api/sessions', async (req, res) => {
    console.log("/api/sessions 실행됨. = ");
    var session = await openvidu.createSession(req.body);
    console.log("session.sessionId = ", session.sessionId);
    res.send(session.sessionId);
});
app.post('/api/sessions/:sessionId/connections', async (req, res) => {
    var session = openvidu.activeSessions.find(
        (s) => s.sessionId === req.params.sessionId
    );
    if (!session) {
        res.status(404).send();
    } else {
        var connection = await session.createConnection(req.body);
        res.send(connection.token);
    }
});

process.on('uncaughtException', err => console.error(err));


socketHandlers(io);
mediasoupRouter(io);

// server.listen(SERVER_PORT, () => {
//     console.log('SERVER_PORT 포트로 서버 연결');
// });

// 매일 자정에 chatGPT를 이용하여 새로운 주제 받기
// 요일 이름과 id값을 저장한 배열
const days = [
    { id: 1, name: 'Mon', toMinus: 7 },
    { id: 2, name: 'Tue', toMinus: 1 },
    { id: 3, name: 'Wed', toMinus: 2 },
    { id: 4, name: 'Thu', toMinus: 3 },
    { id: 5, name: 'Fri', toMinus: 4 },
    { id: 6, name: 'Sat', toMinus: 5 },
    { id: 7, name: 'Sun', toMinus: 6 },
];
// second minute hour day-of-month month day-of-week
days.forEach((day) => {
    cron.schedule(`0 0 0 * * ${day.name}`, async () => {
        try {
            const list = [1, 2, 3, 4, 5, 6, 7, 8];
            for (const data of list) {
                const kategorieId = data;
                const { kategorieName } = await Kategorie.findOne({
                    attributes: ['kategorieName'],
                    where: { kategorieId },
                });

                //GPT에 질문하기
                var [kategorieName1, kategorieName2] = kategorieName.split('/');
                if (!kategorieName2) {
                    kategorieName2 = ' ';
                }
                const { ask } = {
                    ask: `${kategorieName1} 혹은 ${kategorieName2} 카테고리에 대한 황당하고 엽기스러운 VS 형식의 토론 주제 100가지를 숫자 없이 큰따옴표 안에 주제만 적어서 배열 형식으로 새로 나열해줘.`,
                };

                const reply = await callChatGPT([
                    { role: 'user', content: ask },
                ]);
                console.log(reply.content);

                const subjectList = reply.content; //+ subject.subjectList;
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

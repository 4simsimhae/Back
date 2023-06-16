const env = require('dotenv').config(); //환경변수를 .env로 관리
const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();

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

app.use(express.json());
app.use('/docs-api', swaggerUi.serve, swaggerUi.setup(swaggerDocs)); //스웨거 확인 api
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/api', [indexRouter]);

// CORS 설정
// const cors = require('cors');
// app.use(
//     cors({
//         origin: ['https://', 'http://localhost:3000'],
//         credentials: true,
//     })
// );

app.get('/', (req, res) => {
    res.status(200).send('simsimhae API / Use "/docs-api" Page');
});

app.listen(3000, () => {
    console.log('3000 포트로 서버 연결');
});

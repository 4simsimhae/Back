const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0', // Swagger 버전
        info: {
            title: '4조 실전프로젝트 문서', // API 문서 제목
            version: '1.0.0', // API 버전
            description: 'API 문서를 위한 Swagger',
        },
        servers: [
            {
                url: 'http://localhost:3000', // 서버 URL
            },
        ],
    },
    apis: ['./routes/*.js'], // API 경로 설정
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);

module.exports = swaggerDocs;

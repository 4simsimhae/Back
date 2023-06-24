const express = require('express');
const router = express.Router();
const { User, Kategorie, UserInfo, Room, Subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

//open API
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

// 응답 객체
class ApiResponse {
    constructor(code, message = '', data = {}) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
}

//chatGPT 오픈 API 호출
async function callChatGPT(prompt) {
    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
    });

    try {
        const openai = new OpenAIApi(configuration);
        const response = await openai.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: prompt,
            temperature: 0.8,
        });
        const reply = response.data.choices[0].message;
        return reply;
    } catch (error) {
        console.error('Error calling ChatGPT API:', error);
        if (error.response) {
            console.log('Response status:', error.response.status);
            console.log('Response data:', error.response.data);
        }
        return null;
    }
}

// //chatGPT에 질문하기 (기본 테스트창)
// router.get('/chatgpt', async (req, res) => {
//     try {
//         const { ask } = {
//             ask: `여기에 테스트용으로 하고싶은 말을 적으면 됩니다`,
//         };
//         const reply = await callChatGPT([{ role: 'user', content: ask }]);

//         if (reply && reply.content) {
            //응답 들어있는지 확인
        //     const content = JSON.parse(reply.content);
        //     const objectReply = Object.values(content);
        //     res.json({ role: 'user', reply: objectReply });
        //     //질문 몇개 DB에 저장하기 코드 추가예정
        // } else {
        //     //DB에 저장되어있는 파일 불러오기 코드 추가예정
        //     res.json(reply);
        // }
//         const response = new ApiResponse(200, '', { reply: reply });
//         return res.status(200).json(response);
//     } catch (error) {
//         const response = new ApiResponse(
//             500,
//             '예상하지 못한 서버 문제가 발생했습니다.'
//         );
//         return res.status(500).json(response);
//     }
// });

//카테고리 별 주제 8개 받기
router.post('/chatgpt', async (req, res) => {
    try {
        const { kategorieName } = req.body;
        //여기 아래에 있는 문장을 적절하게 수정하여
        //우리가 원하는 형식의 질문을 받아야합니다.
        const { ask } = {
            ask: `${kategorieName}에 관련해서 유머러스한 토론 주제 8가지를 새로 추천해줘`,
        };
        console.log(ask);
        const reply = await callChatGPT([{ role: 'user', content: ask }]);

        //몇초 기다린 후 없으면 DB값 불러오기
        if (reply && reply.content) {
            //응답 들어있는지 확인
            const content = JSON.parse(reply.content);
            const objectReply = Object.values(content);
            res.json({ role: 'user', reply: objectReply });
            //질문 몇개 DB에 저장하기 코드 추가예정
        } else {
            //DB에 저장되어있는 파일 불러오기 코드 추가예정
            res.json(reply);
        }
    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

//선택된 주제 받기
router.put('/chatgpt/:roomid', async (req, res) => {
    try {
        const { roomId } = req.params;
        const { newroomName } = req.body;

        // 해당 room 존재 여부 확인
        const room = await Room.findOne({ where: { roomId } });
        if (!room) {
            const response = new ApiResponse(
                404,
                '해당 방을 찾을 수 없습니다.'
            );
            return res.status(404).json(response);
        }

        //방 제목 수정 및 저장
        room.roomName = newroomName;
        await room.save();
        const response = new ApiResponse(200, '');
        return res.status(200).json(response);
    } catch {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

module.exports = router;

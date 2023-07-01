const express = require('express');
const router = express.Router();
const { User, Kategorie, UserInfo, Room, Subject, chat } = require('../models');

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

//chatGPT에 질문하기 (기본 테스트창)//
router.get('/chatgpt', async (req, res) => {
    try {
        const { ask } = {
            ask: `여기에 테스트용으로 하고싶은 말을 적으면 됩니다`,
        };
        const reply = await callChatGPT([{ role: 'user', content: ask }]);

        const response = new ApiResponse(200, '', { reply: reply });
        return res.status(200).json(response);
    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

// //카테고리 별 주제 8개 받기
// router.post('/chatgpt/:kategorieId', async (req, res) => {
//     try {
//         const { kategorieId } = req.params;
//         const { kategorieName } = await Kategorie.findOne({
//             attributes: ['kategorieName'],
//             where: { kategorieId },
//         });

//         //GPT에 질문하기
//         const [ kategorieName1, kategorieName2] = kategorieName.split(' ');
//         const { ask } = {
//             ask: `${kategorieName1} 혹은 ${kategorieName2} 카테고리에 대한 황당하고 엽기스러운 VS 형식의 토론 주제 100가지를 숫자 없이 큰따옴표 안에 주제만 적어서 배열 형식으로 새로 나열해줘.`,
//         };

//         const reply = await callChatGPT([{ role: 'user', content: ask }]);
//         console.log(reply.content);

//         const subjectList = reply.content //+ subject.subjectList;
//         const roomlist = await Subject.update(
//             {
//                 subjectList,
//             },
//             {
//                 where: { kategorieId },
//             }
//         );
//         res.json({ roomlist });
//         //질문 몇개 DB에 저장하기 코드 추가예정
        
//     } catch (error) {
//         const response = new ApiResponse(
//             500,
//             '예상하지 못한 서버 문제가 발생했습니다.'
//         );
//         return res.status(500).json(response);
//     }
// });

//선택된 주제 받기//
router.put('/chatgpt/:roomId', async (req, res) => {
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

const express = require('express');
const router = express.Router();
//const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

//open API
require('dotenv').config();
const { Configuration, OpenAIApi } = require('openai');

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

//chatGPT로 질문 8개 받아오기
router.post('/chatgpt', async (req, res) => {
    try {
        //여기 아래에 있는 문장을 적절하게 수정하여
        //우리가 원하는 형식의 질문을 받아야합니다.
        const { ask } = {
            ask: '연애 카테고리에 대한 황당하고 엽기스러운 토론 주제 8가지를 json 형식으로 주제만 적어서 새로 추천해줘',
        };
        const reply = await callChatGPT([{ role: 'user', content: ask }]);

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
        console.log(error);
        return res.status(500).json('예상하지 못한 서버 문제가 발생했습니다.');
    }
});

//선택된 주제 받기
router.put('/:roomId', async (req, res) => {
    res.status(200).send('선택된 주제 받기 api');
});

module.exports = router;

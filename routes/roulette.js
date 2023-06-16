const express = require('express');
const router = express.Router();
//const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

//chatGPT 오픈 API 받아오기

//chatGPT에서 질문 8개 받아오기
router.put('/:roomId', async (req, res) => {
    res.status(200).send('질문 받기 api');
});

//선택된 주제 받기
router.put('/:roomId', async (req, res) => {
    res.status(200).send('선택된 주제 받기 api');
});

module.exports = router;

const express = require('express');
const router = express.Router();
//const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

//채팅 보내기
router.post('/:roomId/chat', async (req, res) => {
    res.status(200).send('채팅보내기 api');
});

//채팅 목록확인
router.get('/:roomId/chat', async (req, res) => {
    res.status(200).send('채팅 목록확인 api');
});

module.exports = router;

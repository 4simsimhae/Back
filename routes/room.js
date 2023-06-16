const express = require('express');
const router = express.Router();
//const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기



//게임 방 리스트
router.get('/roomlist/:kategorieId', async (req, res) => {
    res.status(200).send('게임 방 리스트 확인하기 api');
});

//게임 방 상세정보
router.get('/roomlist/:roomId', async (req, res) => {
    res.status(200).send('게임 방 상세정보 확인하기 api');
});

//게임 방 만들기
router.post('/roomlist/:kategorieId', async (req, res) => {
    res.status(200).send('게임 방 만들기 api');
});

//배심원으로 참여하기
router.put('/jury/:roomId', async (req, res) => {
    res.status(200).send('배심원으로 참여하기 api');
});

//토론자로 참여하기
router.put('/discussant/:roomId', async (req, res) => {
    res.status(200).send('토론자로 참여하기 api');
});

//방 삭제하기
router.delete('/roomlist/:roomId', async (req, res) => {
    res.status(200).send('방 삭제하기 api');
});


module.exports = router;
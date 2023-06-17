const express = require('express');
const router = express.Router();
//const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

//좋아요 버튼
router.post('/:userId/like', async (req, res) => {
    res.status(200).send('좋아요 버튼 api');
});

//싫어요 버튼
router.post('/:userId/hate', async (req, res) => {
    res.status(200).send('싫어요 버튼 api');
});

//물음표 버튼
router.post('/:userId/questionMark', async (req, res) => {
    res.status(200).send('물음표 버튼 api');
});

//도전자 버튼
router.put('/:roomId/challenge', async (req, res) => {
    res.status(200).send('도전자 버튼 api');
});

//포기하기 버튼
router.put('/:roomId/giveup', async (req, res) => {
    res.status(200).send('포기하기 버튼 api');
});

module.exports = router;

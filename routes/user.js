const express = require('express');
const router = express.Router();
//const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

//회원가입 API
router.put('/join', async (req, res) => {
    res.status(200).send('회원가입 api');
});

module.exports = router;

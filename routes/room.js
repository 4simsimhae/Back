const express = require('express');
const router = express.Router();
const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

// 응답 객체
class ApiResponse {
    constructor(code, message = '', data = {}) {
        this.code = code;
        this.message = message;
        this.data = data;
    }
}

//카테고리 목록
router.get('/kategorie', async (req, res) => {
    try{
        const kategorielist = await Kategorie.findAll({
            attributes: ['KategorieId', 'KategorieName'],
            //order: [],
        });
        
        const response = new ApiResponse(200, '', kategorielist);
        return res.status(200).json(response)

    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

//게임 방 리스트
router.get('/roomlist/:kategorieId', async (req, res) => {
    try{
        const { kategorieId } = req.params;

        const roomlist = await Room.findAll({
            attributes: ['roomId', 'KategorieName', 'roomName', 'debater', 'panel'],
            where: { kategorieId },
            //order: [],
        });
        
        const response = new ApiResponse(200, '', roomlist);
        return res.status(200).json(response)

    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});


//게임 방 만들기
router.post('/roomlist/:kategorieId', async (req, res) => {
    try{
        const { kategorieId } = req.params;
        //const { KategorieName } = req.body;

        const { kategorieName } = await Kategorie.findOne({
            attributes: ["kategorieName"],
            where: { kategorieId }
        });
        console.log(kategorieName);

        const roomName = ''; //openAPI로 이름받기
        const debater = 0;
        const panel = 0;

        await Room.create({ kategorieId, kategorieName, roomName, debater, panel })
        const response = new ApiResponse(200, '', []);
        return res.status(200).json(response)
    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

//배심원으로 참여하기
router.put('/jury/:roomId', async (req, res) => {
    try{

    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

//토론자로 참여하기
router.put('/discussant/:roomId', async (req, res) => {
    try{

    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

//방 삭제하기
router.delete('/roomlist/:roomId', async (req, res) => {
    try{

    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});


module.exports = router;
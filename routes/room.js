const express = require('express');
const router = express.Router();
const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
const randomName = require('../middlewares/randomName.js');
const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기


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

        //잘못된 kategorieId
        if (kategorieId>8 || kategorieId<1) {
            const response = new ApiResponse(
                403,
                '해당 카테고리를 찾을 수 없습니다.'
            );
            return res.status(403).json(response);
        }
        
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


//게임 방 상세정보
router.get('/roomlist/room/:roomId', async (req, res) => {
    try{
        const { roomId } = req.params;

        const roomlist = await Room.findAll({
            attributes: ['KategorieName', 'roomName', 'debater', 'panel'],
            where: { roomId },
        });
        //잘못된 roomId
        const existroomId = await Room.findOne({
            attributes: ["roomName"],
            where: { roomId }
        });
        console.log('kategorieName = ', roomlist)
        if (!existroomId) {
            const response = new ApiResponse(
                403,
                '존재하지 않는 게임방입니다.'
            );
            return res.status(403).json(response);
        }

        //결과
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
router.post('/roomlist/:kategorieId', randomName, async (req, res) => {
    try{
        const { kategorieId } = req.params;

        const { kategorieName } = await Kategorie.findOne({
            attributes: ["kategorieName"],
            where: { kategorieId }
        });

        //잘못된 kategorieId
        if (kategorieId>8 || kategorieId<1) {
            const response = new ApiResponse(
                403,
                '해당 카테고리를 찾을 수 없습니다.'
            );
            return res.status(403).json(response);
        }

        //const roomName = res.locals.random; //openAPI로 이름받기
        const roomName = '길에 서있는 탄산수';
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
router.put('/jury/:roomId', checkLogin, async (req, res) => {
    try{
        const { roomId } = req.params;
        const { userId } = res.locals.user;

        const roomlist = await Room.findAll({
            attributes: ['KategorieName', 'roomName', 'debater', 'panel'],
            where: { roomId },
        });
        //잘못된 roomId
        const existroomId = await Room.findOne({
            attributes: ["roomName"],
            where: { roomId }
        });
        console.log('kategorieName = ', roomlist)
        if (!existroomId) {
            const response = new ApiResponse(
                403,
                '존재하지 않는 게임방입니다.'
            );
            return res.status(403).json(response);
        }
        //만약 로그인 유저가 아니라면! 정보만들기

        //로그인 유저라면 정보 수정하기!

        //결과
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

//토론자로 참여하기
router.put('/discussant/:roomId', checkLogin, async (req, res) => {
    try{
        const { roomId } = req.params;
        const { userId } = res.locals.user;

        const roomlist = await Room.findAll({
            attributes: ['KategorieName', 'roomName', 'debater', 'panel'],
            where: { roomId },
        });

        //잘못된 roomId
        const existroomId = await Room.findOne({
            attributes: ["roomName"],
            where: { roomId }
        });
        console.log('kategorieName = ', roomlist)
        if (!existroomId) {
            const response = new ApiResponse(
                403,
                '존재하지 않는 게임방입니다.'
            );
            return res.status(403).json(response);
        }

        //만약 로그인 유저가 아니라면 오류!

        //userInfo 수정
        nickName = '아가리 파이터'; //오픈API로 받기
        like = 0;
        hate = 0;
        questionMark = 0;
        debater = 1;
        await UseInfo.update({ nickName, like, hate, questionMark, debater, updatedAt: new Date()}, {
            where: { userId }
        });

        //방 토론자 수 증가
        const { debaterNumber } = await Room.findOne({
            attributes: ["debater"],
            where: { roomId }
        });
        await Room.update({ debater : debaterNumber.debater + 1 }, {
            where: { roomId }
        });

        //결과
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
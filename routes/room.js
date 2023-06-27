const express = require('express');
const router = express.Router();
const { User, Kategorie, UserInfo, Room, subject, chat } = require('../models');
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

/**
 * @swagger
 * paths:
 *  /api/kategoriet:
 *      get:
 *          summary: "카테고리 목록"
 *          requestBody:
 *              content:
 *
 *          responses:
 *              "200":
 *                  description: ""
 *
 *              "500":
 *                  description: "예상하지 못한 서버 문제가 발생했습니다."
 */

//카테고리 목록
router.get('/kategorie', async (req, res) => {
    try {
        const kategorielist = await Kategorie.findAll({
            attributes: ['KategorieId', 'KategorieName'],
            //order: [],
        });

        const response = new ApiResponse(200, '', kategorielist);
        return res.status(200).json(response);
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
    try {
        const { kategorieId } = req.params;

        const roomlist = await Room.findAll({
            attributes: [
                'roomId',
                'KategorieName',
                'roomName',
                'debater',
                'panel',
            ],
            where: { kategorieId },
            //order: [],
        });

        //잘못된 kategorieId
        if (kategorieId > 8 || kategorieId < 1) {
            const response = new ApiResponse(
                403,
                '해당 카테고리를 찾을 수 없습니다.'
            );
            return res.status(403).json(response);
        }

        const response = new ApiResponse(200, '', roomlist);
        return res.status(200).json(response);
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
    try {
        const { roomId } = req.params;

        const roomlist = await Room.findAll({
            attributes: ['KategorieName', 'roomName', 'debater', 'panel'],
            where: { roomId },
        });
        //잘못된 roomId
        const existroomId = await Room.findOne({
            attributes: ['roomName'],
            where: { roomId },
        });
        if (!existroomId) {
            const response = new ApiResponse(
                403,
                '존재하지 않는 게임방입니다.'
            );
            return res.status(403).json(response);
        }

        //결과
        const response = new ApiResponse(200, '', roomlist);
        return res.status(200).json(response);
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
    try {
        const { kategorieId } = req.params;
        const newroomName = res.locals.random; //openAPI로 이름받기
        const { kategorieName } = await Kategorie.findOne({
            attributes: ['kategorieName'],
            where: { kategorieId },
        });

        //잘못된 kategorieId
        if (kategorieId > 8 || kategorieId < 1) {
            const response = new ApiResponse(
                403,
                '해당 카테고리를 찾을 수 없습니다.'
            );
            return res(response);
        }

        const roomName = newroomName;
        const debater = 0;
        const panel = 0;

        const createdRoom = await Room.create({
            kategorieId,
            kategorieName,
            roomName,
            debater,
            panel,
        });
        const roomId = createdRoom.roomId;

        const roomlist = await Room.findAll({
            attributes: [
                'roomId',
                'KategorieName',
                'roomName',
                'debater',
                'panel',
            ],
            where: { roomId },
        });

        const response = new ApiResponse(200, '', roomlist);
        return res.status(200).json(response);
    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

//입장하기 버튼으로 랜덤닉네임 생성하기
router.put('/user', checkLogin, randomName, async (req, res) => {
    try {
        const { userId } = res.locals.user;
        const randomName = res.locals.random; //openAPI로 이름받기

        //userInfo 수정
        const splitname = randomName.split(' ');
        const newRandomName = splitname[splitname.length - 1];
        console.log(newRandomName);
        const nickName = newRandomName; //오픈API로 받기
        const like = 0;
        const hate = 0;
        const questionMark = 0;
        const debater = 0;
        const roomId = 0;

        if (!userId) {
            //만약 로그인 유저가 아니라면! 정보만들기
            if (!userId) {
                // 만약 로그인 유저가 아니라면! 정보 만들기
                const newUser = await User.create({
                    kakaoId:
                        'notlogin' +
                        Math.floor(100000 + Math.random() * 900000),
                });
                await UserInfo.create({
                    userId: newUser.userId, // User 테이블에서 생성된 user.id 값을 참조
                    roomId,
                    nickName,
                    like,
                    hate,
                    questionMark,
                    debater,
                });
            }
        } else {
            //로그인 유저라면 정보 수정하기!
            await UserInfo.update(
                {
                    nickName,
                    roomId,
                    like,
                    hate,
                    questionMark,
                    debater,
                    updatedAt: new Date(),
                },
                {
                    where: { userId },
                }
            );
        }

        //결과
        const response = new ApiResponse(200, '', []);
        return res.status(200).json(response);
    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

//토론자로 참여하기
router.put('/discussant/:roomId', checkLogin, randomName, async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = res.locals.user;
        const randomName = res.locals.random; //openAPI로 이름받기

        const roomlist = await Room.findAll({
            attributes: ['KategorieName', 'roomName', 'debater', 'panel'],
            where: { roomId },
        });

        //잘못된 roomId
        const existroomId = await Room.findOne({
            attributes: ['roomName'],
            where: { roomId },
        });
        if (!existroomId) {
            const response = new ApiResponse(
                403,
                '존재하지 않는 게임방입니다.'
            );
            return res.status(403).json(response);
        }

        //만약 로그인 유저가 아니라면 오류!
        console.log('토큰안에 어떤정보가 담겨있냐 = ', userId);
        if (!userId) {
            const response = new ApiResponse(
                403,
                '로그인이 필요한 서비스입니다.'
            );
            return res.status(403).json(response);
        }

        //userInfo 수정

        const splitname = randomName.split(' ');
        const newRandomName = randomName[splitname.length];
        const nickName = newRandomName; //오픈API로 받기
        const like = 0;
        const hate = 0;
        const questionMark = 0;
        const debater = 1;
        await UserInfo.update(
            {
                nickName,
                roomId,
                like,
                hate,
                questionMark,
                debater,
                updatedAt: new Date(),
            },
            {
                where: { userId },
            }
        );

        // //방 토론자 수 증가
        // const { debaterNumber } = await Room.findOne({
        //     attributes: ['debater'],
        //     where: { roomId },
        // });
        // await Room.update(
        //     { debater: debaterNumber.debater + 1 },
        //     {
        //         where: { roomId },
        //     }
        // );

        //결과
        const response = new ApiResponse(200, '', []);
        return res.status(200).json(response);
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
    try {
        const { roomId } = req.params;
        await Room.destroy({
            where: { roomId },
        });
        const response = new ApiResponse(200, '방이 삭제되었습니다', []);
        return res.status(200).json(response);
    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

module.exports = router;

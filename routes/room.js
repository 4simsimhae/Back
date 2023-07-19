const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const {
    User,
    Kategorie,
    UserInfo,
    Room,
    subject,
    chat,
    Vote,
} = require('../models');
const randomName = require('../middlewares/randomName.js');
const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기
const randomNickName = require('../middlewares/randomNickName.js');

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
router.post(
    '/roomlist/:kategorieId',
    checkLogin,
    randomNickName,
    async (req, res) => {
        try {
            const { userId } = res.locals.user;
            // console.log('디코드된 유저정보 = ', res.locals.user);
            const { kategorieId } = req.params;
            const newroomName = res.locals.random; //openAPI로 이름받기
            const { kategorieName } = await Kategorie.findOne({
                attributes: ['kategorieName'],
                where: { kategorieId },
            });

            //만약 로그인 유저가 아니라면 오류!
            console.log('토큰안에 어떤정보가 담겨있냐 = ', userId);
            if (!userId) {
                console.log('유저 없음');
                const response = new ApiResponse(
                    403,
                    '로그인이 필요한 서비스입니다.'
                );
                return res.status(403).json(response);
            }

            //잘못된 kategorieId
            if (kategorieId > 8 || kategorieId < 1) {
                console.log('카테고리 잘못됨');
                const response = new ApiResponse(
                    403,
                    '해당 카테고리를 찾을 수 없습니다.'
                );
                return res(response);
            }

            //방 생성 정보
            const roomName = newroomName;

            const createdRoom = await Room.create({
                kategorieId,
                kategorieName,
                roomName,
                debater: 0,
                gameStart: 0,
                panel: 0,
            });
            console.log('방생성 완료');

            const roomId = createdRoom.roomId;

            await Vote.create({
                roomId,
                debater1Count: 0,
                debater2Count: 0,
            });

            const roomlist = await Room.findAll({
                //방정보 불러오기 후 보내기
                attributes: [
                    'roomId',
                    'KategorieName',
                    'roomName',
                    'debater',
                    'gameStart',
                    'panel',
                ],
                where: { roomId },
            });

            //userInfo 수정

            await UserInfo.update(
                {
                    roomId,
                    like: 0,
                    hate: 0,
                    questionMark: 0,
                    debater: 1,
                    host: 1,
                    updatedAt: new Date(),
                },
                {
                    where: { userId },
                }
            );

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
    }
);

//입장하기 버튼으로 랜덤닉네임 생성하기
router.put('/user', checkLogin, randomNickName, async (req, res) => {
    try {
        const { userId } = res.locals.user;
        // console.log('디코드된 유저정보 = ', res.locals.user);
        const randomName = res.locals.random; //openAPI로 이름받기

        //userInfo 수정
        const splitname = randomName.split(' ');
        const newRandomName = splitname[splitname.length - 1];
        const nickName = newRandomName; //오픈API로 받기

        if (!userId) {
            console.log('비로그인 유저 ---------- ');
            //만약 로그인 유저가 아니라면! 정보만들기
            const newNoLoginUser = await User.create(
                //User 정보 생성하기
                {
                    kakaoId: 0,
                }
            );
            const avatars = {
                name: 'Chien-Shiung',
                color: ['#6458d6,#a08f43,#6696f0,#9e756e,#ce285e'],
            };
            const avatarString = JSON.stringify(avatars);
            await UserInfo.create({
                //UserInfo 생성하기
                nickName,
                userId: newNoLoginUser.userId,
                roomId: 0,
                like: 0,
                hate: 0,
                questionMark: 0,
                debater: 0,
                host: 0,
                afterRoomId: 0,
                avatar: avatarString,
            });
            const token = jwt.sign(
                //그리고 토큰보내기
                {
                    userId: newNoLoginUser.userId,
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: '1d',
                }
            );
            console.log('-------------');
            console.log('비로그인 유저 토큰 = ', token);
            console.log('-------------');
            //헤더에 토큰담아 보내기
            //결과
            const response = new ApiResponse(200, '', [
                { Authorization: `Bearer ${token}`, kakaoId: 0 },
            ]);
            return res.status(200).json(response);
        } else {
            // console.log('정보 있음 = ', res.locals.user);

            //로그인 유저라면 정보 수정하기!
            await UserInfo.update(
                {
                    nickName,
                    roomId: 0,
                    like: 0,
                    hate: 0,
                    questionMark: 0,
                    debater: 0,
                    host: 0,
                    afterRoomId: 0,
                    updatedAt: new Date(),
                },
                {
                    where: { userId },
                }
            );
            //결과
            const response = new ApiResponse(200, '', []);
            return res.status(200).json(response);
        }
    } catch (error) {
        const response = new ApiResponse(
            500,
            '예상하지 못한 서버 문제가 발생했습니다.'
        );
        return res.status(500).json(response);
    }
});

module.exports = router;

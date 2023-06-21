const express = require('express');
const router = express.Router();
const { UserInfo } = require('../models');
//const { User, Kategorie, UseInfo, Room, subject, chat } = require('../models');
//const checkLogin = require('../middlewares/checkLogin.js'); //유저아이디받기

router.post('/:userId/like', async (req, res, next) => {
    try {
        const userId = req.params.userId;
        console.log('userId =', userId);

        // userId 조회
        const debater = await UserInfo.findOne({ where: { userId } });
        console.log('debater =', debater);

        if (!debater) {
            res.status(404).json({ errorMessage: '유저를 찾을 수 없습니다.' });
            return;
        }

        // 좋아요 수 증가
        debater.like += 1;
        await debater.save();

        res.status(200).json({
            message: '유저에 좋아요를 눌렀습니다.',
            likes: debater.like,
        });
    } catch (error) {
        console.error('좋아요 처리 실패:', error);
        res.status(500).json({ error: '좋아요 처리에 실패했습니다.' });
    }
});

// 싫어요 버튼
router.post('/:userId/hate', async (req, res, next) => {
    try {
        const userId = req.params.userId;
        console.log('userId =', userId);

        // userId 조회

        const debater = await UserInfo.findOne({ where: { userId } });
        console.log('debater =', debater);

        if (!debater) {
            res.status(404).json({ errorMessage: '유저를 찾을 수 없습니다.' });
            return;
        }

        // 싫어요 수 증가
        debater.hate += 1;
        await debater.save();

        res.status(200).json({
            message: '유저에 싫어요를 눌렀습니다.',
            hates: debater.hate,
        });
    } catch (error) {
        console.error('싫어요 처리 실패:', error);
        res.status(500).json({ error: '싫어요 처리에 실패했습니다.' });
    }
});

// ?표 버튼
router.post('/:userId/questionMark', async (req, res, next) => {
    try {
        const userId = req.params.userId;
        console.log('userId =', userId);

        // userId 조회
        const debater = await UserInfo.findOne({ where: { userId } });
        console.log('debater =', debater);

        if (!debater) {
            res.status(404).json({ errorMessage: '유저를 찾을 수 없습니다.' });
            return;
        }

        // 좋아요 수 증가
        debater.questionMark += 1;
        await debater.save();

        res.status(200).json({
            message: '유저에 ?를 눌렀습니다.',
            questionMarks: debater.questionMark,
        });
    } catch (error) {
        console.error('? 처리 실패:', error);
        res.status(500).json({ error: '? 처리에 실패했습니다.' });
    }
});

// //도전자 버튼
// router.put('/:roomId/challenge', async (req, res) => {
//     res.status(200).send('도전자 버튼 api');
// });

// //포기하기 버튼
// router.put('/:roomId/giveup', async (req, res) => {
//     res.status(200).send('포기하기 버튼 api');
// });

module.exports = router;

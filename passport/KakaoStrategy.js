const passport = require('passport');
const KakaoStrategy = require('passport-kakao').Strategy;
const jwt = require('jsonwebtoken');
const { User, UserInfo } = require('../models');

module.exports = () => {
    passport.use(
        new KakaoStrategy(
            {
                clientID: process.env.KAKAO_ID,
                callbackURL: '/auth/kakao/callback',
            },
            // passport-kakao 콜백 함수
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const exUser = await User.findOne({
                        where: {
                            kakaoId: profile.id,
                        },
                    });
                    console.log('accessToken =', accessToken);
                    console.log('refreshToken =', refreshToken);

                    // 기존 사용자일 경우
                    if (exUser) {
                        const token = jwt.sign(
                            {
                                userId: exUser.userId,
                            },
                            process.env.JWT_SECRET,
                            {
                                expiresIn: '1d',
                            }
                        );
                        return done(null, token);
                    } else {
                        // 새로운 사용자일 경우
                        const newUser = await User.create({
                            kakaoId: profile.id, // 유저이메일 저장
                            nickName: profile.displayName,
                        });

                        const avatars = {
                            name: 'Chien-Shiung',
                            color: ['#6458d6,#a08f43,#6696f0,#9e756e,#ce285e'],
                        };
                        const avatarString = JSON.stringify(avatars);

                        await UserInfo.create({
                            userId: newUser.userId,
                            // 나머지 정보 저장
                            roomId: 0,
                            nickName: profile.displayName,
                            avatar: avatarString,
                            like: 0,
                            hate: 0,
                            questionMark: 0,
                            debater: 0,
                            host: 0,
                            afterRoomId: 0,
                        });

                        const token = jwt.sign(
                            {
                                userId: newUser.userId,
                            },
                            process.env.JWT_SECRET,
                            {
                                expiresIn: '1d',
                            }
                        );
                        return done(null, token);
                    }
                } catch (error) {
                    console.error(error);
                    done(error);
                }
            }
        )
    );
};

const { UserInfo } = require('../models');

const avatarName = [
    'Mary Baker',
    'Amelia Earhart',
    'Mary Roebling',
    // ... (나머지 아바타 이름들)
];

function randomRgb() {
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let b = Math.floor(Math.random() * 256);
    return [r, g, b];
}

function randomRgbHex() {
    let [r, g, b] = randomRgb();
    r = r.toString(16).padStart(2, '0');
    g = g.toString(16).padStart(2, '0');
    b = b.toString(16).padStart(2, '0');
    return r + g + b;
}

module.exports = async (socket, next) => {
    try {
        const randomAvatarName =
            avatarName[Math.floor(Math.random() * avatarName.length)];

        const avatarColor = [];
        while (avatarColor.length < 5) {
            const [r, g, b] = randomRgb();
            const colorHex = `${r.toString(16).padStart(2, '0')}${g
                .toString(16)
                .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            avatarColor.push(colorHex);
        }

        const avatar = {
            name: randomAvatarName,
            color: avatarColor.join(','),
        };
        console.log('avatar =', avatar);

        const userId = socket.locals.user.userId;
        console.log('userId =', userId);
        const userInfo = await UserInfo.findOne({ where: { userId } });
        console.log('userInfo =', userInfo);
        if (userInfo) {
            userInfo.avatar = JSON.stringify(avatar); // 아바타 객체를 문자열로 변환하여 저장
            await userInfo.save();
            socket.locals.avatar = avatar;

            const roomId = userInfo.roomId;
            const avatars = {}; // 빈 객체로 초기화
            avatars[roomId] = {
                avatars: [avatar], // 배열로 아바타 추가
            };

            socket.locals.avatars = avatars[roomId]?.avatars || [];
        } else {
            console.error('사용자 정보를 찾을 수 없습니다.');
        }

        next();
    } catch (error) {
        console.error('랜덤 아바타 생성에 실패했습니다:', error);
        socket.emit('error', '랜덤 아바타 생성에 실패했습니다.');
        next();
    }
};

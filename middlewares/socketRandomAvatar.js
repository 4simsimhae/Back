const { UserInfo } = require('../models');

const avatarName = [
    'Mary Baker',
    'Amelia Earhart',
    'Mary Roebling',
    'Sarah Winnemucca',
    'Margaret Brent',
    'Lucy Stone',
    'Mary Edwards',
    'Margaret Chase',
    'Mahalia Jackson',
    'Maya Angelou',
    'Margaret Bourke',
    'Eunice Kennedy',
    'Carrie Chapman',
    'Elizabeth Peratrovich',
    'Alicia Dickerson',
    'Daisy Gatson',
    'Emma Willard',
    'Amelia Boynton',
    'Maria Mitchell',
    'Sojourner Truth',
    'Willa Cather',
    'Coretta Scott',
    'Harriet Tubman',
    'Fabiola Cabeza',
    'Sacagawea',
    'Esther Martinez',
    'Elizabeth Cady',
    'Bessie Coleman',
    'Ma Rainey',
    'Julia Ward',
    'Irene Morgan',
    'Babe Didrikson',
    'Lyda Conley',
    'Annie Dodge',
    'Maud Nathan',
    'Betty Ford',
    'Rosa Parks',
    'Susan La',
    'Gertrude Stein',
    'Wilma Mankiller',
    'Grace Hopper',
    'Jane Addams',
    'Katharine Graham',
    'Florence Chadwick',
    'Zora Neale',
    'Wilma Rudolph',
    'Annie Jump',
    'Mother Frances',
    'Jovita Idár',
    'Maggie L',
    'Henrietta Swan',
    'Jane Cunningham',
    'Victoria Woodhull',
    'Helen Keller',
    'Patsy Takemoto',
    'Chien-Shiung',
    'Dorothea Dix',
    'Margaret Sanger',
    'Alice Paul',
    'Frances Willard',
    'Sally Ride',
    'Juliette Gordon',
    'Queen Lili',
    'Katharine Lee',
    'Harriet Beecher',
    'Felisa Rincon',
    'Hetty Green',
    'Belva Lockwood',
    'Biddy Mason',
    'Ida B',
    'Eleanor Roosevelt',
    'Maria Goeppert',
    'Phillis Wheatley',
    'Mary Harris',
    'Fannie Lou',
    'Rosalyn Yalow',
    'Susan B',
    'Clara Barton',
    'Lady Deborah',
    'Jane Johnston',
    'Alice Childress',
    'Georgia O',
    'Rebecca Crumpler',
    'Anne Bradstreet',
    'Elizabeth Blackwell',
    'Christa McAuliffe',
    'Edmonia Lewis',
    'Nellie Bly',
    'Mary Cassatt',
    'Pauli Murray',
    'Ellen Swallow',
    'Hedy Lamarr',
    'Pearl Kendrick',
    'Abigail Adams',
    'Margaret Fuller',
    'Emma Lazarus',
    'Marian Anderson',
    'Virginia Apgar',
    'Mary Walton',
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
            const colorHex = `#${r.toString(16).padStart(2, '0')}${g
                .toString(16)
                .padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            avatarColor.push(colorHex);
        }

        const avatar = {
            name: randomAvatarName,
            color: [avatarColor.join(',')],
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

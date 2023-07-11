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
    console.log('****** 랜덤 아바타 미들웨어 시작 ******');
    try {
        const randomAvatarName =
            avatarName[Math.floor(Math.random() * avatarName.length)];

        const avatarColor = [];
        while (avatarColor.length < 5) {
            const colorHex = `#${randomRgbHex()}`;
            avatarColor.push(colorHex);
        }

        const avatar = {
            name: randomAvatarName,
            color: avatarColor,
        };

        const userInfo = await UserInfo.findOne({
            where: { userId: socket.user.userId },
        });

        /* 유저 있을 시 
            1. avatar 객체를 JSON 형태로 userInfo 테이블의 avatar 열에 저장
            2. socket의 avatar property에 저장
        */
        if (userInfo) {
            socket.avatar = avatar;
            userInfo.avatar = JSON.stringify(avatar);
            await userInfo.save();
        } else {
            console.error('사용자 정보를 찾을 수 없습니다.');
        }
        console.log('****** 랜덤 아바타 미들웨어 확인 완료 ******');
        next();
    } catch (error) {
        console.error('랜덤 아바타 생성에 실패했습니다:', error);
        socket.emit('error', '랜덤 아바타 생성에 실패했습니다.');
        next();
    }
};

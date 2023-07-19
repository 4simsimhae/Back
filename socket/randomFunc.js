// 랜덤 아바타 생성함수
const makeRandomAvatar = async (socket) => {
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

    console.log('****** 랜덤 아바타 함수시작 ******');
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

        socket.avatar = JSON.stringify(avatar);
    } catch (error) {
        console.error('랜덤 아바타 생성에 실패했습니다:', error);
        socket.emit('error', '랜덤 아바타 생성에 실패했습니다.');
    }
};

const makeRandomNickName = async (socket) => {
    try {
        const firstName = [
            '등짝스매싱 맞은',
            '어제 과음 한',
            '주식 대박 난',
            '코인 쪽박 난',
            '기타 치는',
            '길가다 넘어진',
            '냄새나는',
            '야동 보다 걸린',
            '통장 잔고 700원',
            '오디션 29104번 떨어진',
            '청약 당첨 된',
            '항해99 수료 한',
            '숙취로 괴로운',
            '여친 한테 차인',
            '헛소리 하는',
            '말이 너무 많은',
            '입대 하루전',
            '수능 답안지 밀려쓴',
            '빛나는 대머리 의',
        ];
        const lastName = [
            '시고르자브종',
            '웰시코기',
            '도베르만',
            '말티즈',
            '보더콜리',
            '개코원숭이',
            '개미핥기',
            '날다람쥐',
            '아이언맨',
            '배트맨',
            '슈퍼맨',
            '스파이더맨',
            '우뢰매',
            '황금박쥐',
            '백터맨',
            '동석이형',
            '아메리카노',
            '카푸치노',
            '에스프레소',
            '카라멜마끼야또',
            '딸기주스',
            '키위주스',
            '오렌지',
            '망고',
            '토마토',
            '애플망고',
            '와플',
            '또띠아',
            '치즈버거',
            '구찌',
            '발렌시아가',
            '샤넬',
            '에르메스',
            '페라리',
            '람보르기니',
            '제네시스',
            '아우디',
        ];

        // 무작위로 firstName 배열 요소 선택
        const randomAIndex = Math.floor(Math.random() * firstName.length);
        const selectedA = firstName[randomAIndex];

        // 무작위로 lastName 배열 요소 선택
        const randomBIndex = Math.floor(Math.random() * lastName.length);
        const selectedB = lastName[randomBIndex];

        const nickName = selectedA + ' ' + selectedB;

        socket.nickName = nickName;
        console.log('****** 소켓 랜덤 닉네임 확인 완료 ******');
    } catch (error) {
        console.error('닉네임 부여 실패:', error);
        socket.request.emit('error', '닉네임 부여에 실패했습니다.');
    }
};

// 랜덤으로 토론자 선택 함수
function getRandomDebaters(debaterList, count) {
    const randomDebaters = [];
    const debaterIndices = [];

    // 랜덤한 인덱스를 가진 토론자 선택
    while (debaterIndices.length < count) {
        const randomIndex = Math.floor(Math.random() * debaterList.length);
        if (!debaterIndices.includes(randomIndex)) {
            debaterIndices.push(randomIndex);
            randomDebaters.push(debaterList[randomIndex]);
        }
    }

    return randomDebaters;
}

// 랜덤한 debatePosition 선택 함수
function getRandomPosition(positions) {
    const randomIndex = Math.floor(Math.random() * positions.length);
    const position = positions[randomIndex];
    positions.splice(randomIndex, 1);
    return position;
}

module.exports = {
    makeRandomAvatar,
    makeRandomNickName,
    getRandomDebaters,
    getRandomPosition,
};

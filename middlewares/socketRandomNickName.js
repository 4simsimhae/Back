module.exports = async (socket, next) => {
    console.log('****** 소켓 랜덤 닉네임 시작 ******');
    try {
        const firstName = [
            '등짝스매싱 맞은',
            '어제 과음 한',
            '주식 대박 난',
            '코인 쪽박 난',
            '기타 치는',
            '길가다 넘어 진',
            '냄새나는',
            '야동 보다 걸린',
            '통장 잔고 700원',
            '오디션 29104번 떨어진',
            '청약 당첨 된',
            '항해99 수료 한',
            '숙취로 괴로운',
            '여친 한테 차인',
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
        next();
    } catch (error) {
        console.error('닉네임 부여 실패:', error);
        socket.request.emit('error', '닉네임 부여에 실패했습니다.');
    }
};

This is the backend repository for the 4조 project named 심심해(미정).

[항해99 파트타임 1기][Chapter 6] 실전 프로젝트

```
# express, sequelize, mysql2, dotenv 라이브러리를 설치합니다.
npm install express sequelize mysql2 dotenv

# sequelize-cli, nodemon 라이브러리를 DevDependency로 설치합니다.
npm install -D sequelize-cli nodemon

# 설치한 sequelize를 초기화 하여, sequelize를 사용할 수 있는 구조를 생성합니다.
npx sequelize init
```

```
#.env 파일 내용
  DB_USERNAME= DB유저 이름 (ex : root)
  DB_PASSWORD= DB암호 (ex : 1q2w3e4r)
  DB_DATABASE= DB이름 (ex : lonetube)
  DB_HOST=HOST 주소 (ex : DATABASE.c1dkpbd3eny.ap-northeast-2.rds.amazonaws.com)
  LISTEN_PORT=포트번호 (ex : 3000)
```

```
내 프로젝트 폴더 이름
├── config
│   └── config.js
├── middlewares
│   └── checklogin.js
│   └── confirm.js
├── migrations
├── models
│   ├── chat.js
│   ├── index.js
│   ├── kategorie.js
│   ├── room.js
│   ├── subject.js
│   ├── user.js
│   └── userinfo.js
│
├── routes
│   ├── chat.js
│   ├── debate.js
│   ├── index.js
│   ├── room.js
│   ├── roulette.js
│   └── user.js
│
├── app.js
├── package-lock.json
└── package.json
```

<!-- npm install --save-dev sequelize-cli@latest -->

```
npx sequelize db:create
```

```
npx sequelize model:generate --name User --attributes userName:string,userEmail:string
npx sequelize model:generate --name UserInfo --attributes userId:integer,roomId:integer,nickName:string,like:integer,hate:integer,questionMark:integer,debater:boolean
npx sequelize model:generate --name Kategorie --attributes kategorieName:string,kategorieImage:string
npx sequelize model:generate --name Room --attributes kategorieName:string,roomName:string,debater:integer,panel:integer
npx sequelize model:generate --name Subject --attributes kategorieName:string,subjectList:string
npx sequelize model:generate --name Chat --attributes roomId:integer,chatList:string
```

```
npx sequelize db:migrate
```

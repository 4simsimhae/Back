#어떤 이미지로부터 새로운 이미지를 생성할지를 지정
FROM node:18

#Dockerfile 을 생성/관리하는 사람


# /app 디렉토리 생성
RUN mkdir -p /app
# /app 디렉토리를 WORKDIR 로 설정
WORKDIR /app
# 현재 Dockerfile 있는 경로의 모든 파일을 /app 에 복사
ADD . /app
# npm install 을 실행
COPY package.json .
RUN npm install
RUN npm i mediasoup tutorials
RUN npm install express httpolyglot socket.io socket.io-client --save
RUN npm install mediasoup
RUN npm install mediasoup-client

#환경변수 NODE_ENV 의 값을 development 로 설정
# ENV NODE_ENV development

#가상 머신에 오픈할 포트
EXPOSE 3000 4443
# EXPOSE 4443/UDP
EXPOSE 2000-2020
EXPOSE 2000-2020/UDP
# EXPOSE 22 80 443 3478
# EXPOSE 3478/UDP
# EXPOSE 40000-57000
# EXPOSE 40000-57000/UDP
# EXPOSE 57001-65535
# EXPOSE 57001-65535/UDP

#컨테이너에서 실행될 명령을 지정

CMD ["node", "app.js"]

#tests
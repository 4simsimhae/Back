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
RUN npm install

#환경변수 NODE_ENV 의 값을 development 로 설정
# ENV NODE_ENV development

#가상 머신에 오픈할 포트
EXPOSE 3000 2000 2001 2002 2003 2004 2005 2006 2007 2008 2009 2010 2011 2012 2013 2013 2014 2015 2016 2017 2018 2019 2020

#컨테이너에서 실행될 명령을 지정

#CMD ["npm", "run", "watch"]
CMD ["node", "app.js"]

#test
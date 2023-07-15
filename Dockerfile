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
EXPOSE 3000 2000 2001 2002 2003 2004 2005 2006 2007 2008 2009 2010 2011 2012 2013 2013 2014 2015 2016 2017 2018 2019 2020 4443
EXPOSE 2000/UDP 2001/UDP 2002/UDP 2003/UDP 2004/UDP 2005/UDP 2006/UDP 2007/UDP 2008/UDP 2009/UDP 2010/UDP 2011/UDP 2012/UDP 2013/UDP 2014/UDP 2015/UDP 2016/UDP 2017/UDP 2018/UDP 2019/UDP 2020/UDP 
 
#컨테이너에서 실행될 명령을 지정

CMD ["node", "app.js"]

#test
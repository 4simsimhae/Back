//index.js
const io = require('socket.io-client')
const mediasoupClient = require('mediasoup-client')

const roomName = window.location.pathname.split('/')[2]

const socket = io("/mediasoup")

let device
let rtpCapabilities
let producerTransport
let consumerTransports = []
let audioProducer
let videoProducer
let consumer
let isProducer = false

// https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
// https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
let params = {
  // mediasoup params
  encodings: [
    {
      rid: 'r0',
      maxBitrate: 100000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r1',
      maxBitrate: 300000,
      scalabilityMode: 'S1T3',
    },
    {
      rid: 'r2',
      maxBitrate: 900000,
      scalabilityMode: 'S1T3',
    },
  ],
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
  codecOptions: {
    videoGoogleStartBitrate: 1000
  }
}

let audioParams;
let videoParams = { params };
let consumingTransports = [];

///////////////////////////////////////////////////////////////////////////////// (코드 cut)
// 첫방 만들어지면 실행 (코드넣기)

//첫 연결, sokiet ID 받기
const newDebate = () => {
  socket.on('connection-success', ({ socketId }) => {
    console.log(socketId)
    getLocalStream()
  })
}


//첫 소켓연결시 audio 와 video 설정
const getLocalStream = () => {
  navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      width: {
        min: 640,
        max: 1920,
      },
      height: {
        min: 400,
        max: 1080,
      }
    }
  })
  .then(streamSuccess)
  .catch(error => {
    console.log(error.message)
  })
}

//오디오 및 비디오 설정 //첫 소켓연결시
const streamSuccess = (stream) => {
  localVideo.srcObject = stream

  audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
  videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

  //방 입장 실행
  joinRoom()
}

///////////////////////////////
//방생성 보내기 (라우터(/server) + (1) RTP Capabilities + (2) Device + (3) transport생성)
const joinRoom = () => {
  socket.emit('joinRoom', { roomName }, (data) => {
    try{
      console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`)
      // local변수에 할당
      // the client Device를 loading할 때 사용 (see createDevice)
      rtpCapabilities = data.rtpCapabilities

      // (2)
      createDevice()

    } catch (error) {
      console.log("joinRoom 소켓 에러");
      console.log(error)
      console.log("-----------");
    }
  })
}

// (2)
// device는 미디어를 전송/수신하기 위해 
// 서버 측의 라우터에 연결하는 엔드포인트입니다.
const createDevice = async () => {
  try {
    device = new mediasoupClient.Device()

    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
    // 라우터(서버 측)의 RTP 기능이 있는 장치를 로드합니다
    await device.load({
      // see getRtpCapabilities() below
      routerRtpCapabilities: rtpCapabilities
    })

    console.log('Device RTP Capabilities', device.rtpCapabilities)

    // (3)
    // device가 한번 load되면 , transport 생성
    createSendTransport()

  } catch (error) {
    console.log(error)
    if (error.name === 'UnsupportedError')
      console.warn('browser not supported')
  }
}

// (3) Transport 생성
const createSendTransport = () => {
  // 서버쪽의 socket.on('createWebRtcTransport', sender?, ...) 참고
  // Producer요청, so sender = true
  socket.emit('createWebRtcTransport', { consumer: false }, ({ params }) => {
    // params에 방정보 (라우터) 추가해서 다시보내줌 

    // 만약 받은 params에 문제가 있다면..
    if (params.error) {
      console.log(params.error)
      return
    }

    console.log(params)

    // client side의 Producer Transport 생성
    // 서버에서 다시 받은 params기반으로 생성됨
    producerTransport = device.createSendTransport(params)

    // 이 이벤트는 transport.products에 대한 첫 번째 호출이 이루어질 때 발생
    // see connectSendTransport() below

    //Transport connect 시켜달라고 서버에 요청
    producerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        // DTLS parameters를 서버로 보내줌
        // 그럼 서버가 soketId와 dtlsParmeters를 연결시켜줌 (transport connect)
        await socket.emit('transport-connect', {
          dtlsParameters,
        })

        // 매개변수가 변경되었음을 알림
        callback()

      } catch (error) {
        errback(error)
      }
    }) 

    //producer의 transport가 연결되면은
    producerTransport.on('produce', async (parameters, callback, errback) => {
      console.log(parameters)

      try {
        // Producer 생성 알림
        // with the following parameters and produce
        // 서버에게 producer id 전송
        // 그럼 서버가 room에 prodcuer id 추가함
        await socket.emit('transport-produce', {
          kind: parameters.kind,
          rtpParameters: parameters.rtpParameters,
          appData: parameters.appData,
        }, ({ id, producersExist }) => {
          // Tell the transport that parameters were transmitted and provide it with the
          // 다시 producer id와  producersExist 을 확인해서 보내줌
          // (producersExist) : 방에 처음 생긴 producer인지 추가된사람인지 알려줌
          
          callback({ id })

          // if producers exist, then join room
          if (producersExist) getProducers() // 첫 producer(방만든사람)일경우 실행
        })
      } catch (error) {
        errback(error)
      }
    })

    connectSendTransport()
  })
}

// producer transport를 이용하여 media를 보내기위한 produce() 요청
const connectSendTransport = async () => {
  // Router에 media 전송
  // 이것은 the 'connect' & 'produce' 이벤트를 유도
  
  audioProducer = await producerTransport.produce(audioParams);
  videoProducer = await producerTransport.produce(videoParams);

  audioProducer.on('trackended', () => {
    console.log('audio track ended')

    // close audio track
  })

  audioProducer.on('transportclose', () => {
    console.log('audio transport ended')

    // close audio track
  })
  
  videoProducer.on('trackended', () => {
    console.log('video track ended')

    // close video track
  })

  videoProducer.on('transportclose', () => {
    console.log('video transport ended')

    // close video track
  })
}

///////////
// 방에 이미 producer가 있는 경우, producer id 정보들을 가져옴 
const getProducers = () => {
  socket.emit('getProducers', producerIds => { //producer의 모든 Id 가져옴
    console.log(producerIds)
    // new producer에 대한 consumer 각각 생성
    // producerIds.forEach(id => signalNewConsumerTransport(id))
    producerIds.forEach(signalNewConsumerTransport) // produce Id에 대하여 각각의 consumer을 생성
  })
}

///////////////////////////////////////////////////////////////////////////////// (코드 cut)
//////// simsimhae 추가 코드

//배심원이 새로 참가하여 new consumer 를 생성하는 경우
//첫 연결, sokiet ID 받기
const newJuror = () => {
  socket.on('connection-success-juror', ({ socketId }) => {
    console.log(socketId)
    newJurorRTPcreate()
  })
}

const newJurorRTPcreate = () => {
  socket.emit('newJuror', { roomName }, (data) => {
    // rtp capability 발급
    try{
      console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`)
      // local변수에 할당
      // the client Device를 loading할 때 사용 (see createDevice)
      rtpCapabilities = data.rtpCapabilities
  
      // (2)
      newJurorCreateDevice()

    } catch (error) {
      console.log("joinRoom 소켓 에러");
      console.log(error)
      console.log("-----------");
    }
  })
}

  // (2)
  // device는 미디어를 전송/수신하기 위해 
  // 서버 측의 라우터에 연결하는 엔드포인트입니다.
  const newJurorCreateDevice = async () => {
    try {
      device = new mediasoupClient.Device()
  
      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
      // 라우터(서버 측)의 RTP 기능이 있는 장치를 로드합니다
      await device.load({
        // see getRtpCapabilities() below
        routerRtpCapabilities: rtpCapabilities
      })
  
      console.log('Device RTP Capabilities', device.rtpCapabilities)

      // 방에 있는 모든 producer Id가져와서 각각의 consumer 생성
      getProducers()
      // => consumer생성
  
    } catch (error) {
      console.log(error)
      if (error.name === 'UnsupportedError')
        console.warn('browser not supported')
    }
  }


///////////////////////////////////////////////////////////////////////////////// (코드 cut)
///////// 새로운 발언자 들어옴

// 기존의 peer에게 서버에서 새로운 producer 알림 및 새로운 consumer 생성
// 즉 1개의 consumer만 생성하는 코드
socket.on('new-producer', ({ producerId }) => signalNewConsumerTransport(producerId))


// 새로운 peer가 들어와서 consumer를 첫 생성할 때 코드
const signalNewConsumerTransport = async (remoteProducerId) => {
  //이미 remoteProducerId를 사용하고 있는지 확인
  if (consumingTransports.includes(remoteProducerId)) return;
  consumingTransports.push(remoteProducerId);

  //consuner Transport 생성
  await socket.emit('createWebRtcTransport', { consumer: true }, ({ params }) => {
    // sever에서 매개변수 다시전송
    // fornt에서 Transport 생성
    if (params.error) {
      console.log(params.error)
      return
    }
    console.log(`PARAMS... ${params}`)

    let consumerTransport
    try {
      consumerTransport = device.createRecvTransport(params)
    } catch (error) {
      // exceptions: 
      // {InvalidStateError} if not loaded
      // {TypeError} if wrong arguments.
      console.log(error)
      return
    }

    consumerTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        // 로컬 DTLS 매개 변수를 서버에 전송
        // see server's socket.on('transport-recv-connect', ...)
        await socket.emit('transport-recv-connect', {
          dtlsParameters,
          serverConsumerTransportId: params.id,
        })

        // 매개변수 전송 알림
        callback()
      } catch (error) {
        // transport 오류
        errback(error)
      }
    })

    connectRecvTransport(consumerTransport, remoteProducerId, params.id)
  })
}

//consumer을 생성하기위해 server에 요청
const connectRecvTransport = async (consumerTransport, remoteProducerId, serverConsumerTransportId) => {
  // rtpCapabilities 기반으로 consumer생성 및 consume
  // 만약 router가 consume 상태면, 아래 params 전송
  await socket.emit('consume', {
    rtpCapabilities: device.rtpCapabilities,
    remoteProducerId,
    serverConsumerTransportId,
  }, async ({ params }) => {
    if (params.error) {
      console.log('Cannot Consume')
      return
    }

    console.log(`Consumer Params ${params}`)
    // consumer를 생성하는 local consumer transport를 consume ??
    const consumer = await consumerTransport.consume({
      id: params.id,
      producerId: params.producerId,
      kind: params.kind,
      rtpParameters: params.rtpParameters
    })

    consumerTransports = [
      ...consumerTransports,
      {
        consumerTransport,
        serverConsumerTransportId: params.id,
        producerId: remoteProducerId,
        consumer,
      },
    ]

    /////////////////////////////////////////////////////

    // 인원마다 늘어나는 vido 창이 아니므로 삭제?
    // 새로운 consumer media를 위한 div element 생성
    const newElem = document.createElement('div')
    newElem.setAttribute('id', `td-${remoteProducerId}`)

    if (params.kind == 'audio') {
      //append to the audio container
      newElem.innerHTML = '<audio id="' + remoteProducerId + '" autoplay></audio>'
    } else {
      //append to the video container
      newElem.setAttribute('class', 'remoteVideo')
      newElem.innerHTML = '<video id="' + remoteProducerId + '" autoplay class="video" ></video>'
    }

    videoContainer.appendChild(newElem)

    // destructure and retrieve the video track from the producer
    const { track } = consumer //여기까지 삭제

    document.getElementById(remoteProducerId).srcObject = new MediaStream([track])
    // remoteVideoRef.current.srcObject = new MediaStream([track]);

    // 서버 소비자가 미디어를 일시 중지한 상태에서 시작했기 때문에 
    // 서버에 다시 시작하도록 알려야 함
    socket.emit('consumer-resume', { serverConsumerId: params.serverConsumerId })
  })
}

// producer가 닫혔을 때 server notification가 수신됨
socket.on('producer-closed', ({ remoteProducerId }) => {
  // 클라이언트 consumer과 transport 해제
  const producerToClose = consumerTransports.find(transportData => transportData.producerId === remoteProducerId)
  producerToClose.consumerTransport.close()
  producerToClose.consumer.close()

  // 목록에서 consumer transport 제거
  consumerTransports = consumerTransports.filter(transportData => transportData.producerId !== remoteProducerId)

  // video div element 제거
  videoContainer.removeChild(document.getElementById(`td-${remoteProducerId}`))
})
const mediasoup = require('mediasoup');

module.exports = (io) => {
    const connections = io.of('/mediasoup')


/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer 
 **/
let worker
let rooms = {}          // { roomName1: { Router, rooms: [ sicketId1, ... ] }, ...}
let peers = {}          // { socketId1: { roomName1, socket, transports = [id1, id2,] }, producers = [id1, id2,] }, consumers = [id1, id2,], peerDetails }, ...}
let transports = []     // [ { socketId1, roomName1, transport, consumer }, ... ]
let producers = []      // [ { socketId1, roomName1, producer, }, ... ]
let consumers = []      // [ { socketId1, roomName1, consumer, }, ... ]

//워커 생성하기
const createWorker = async () => {
    worker = await mediasoup.createWorker({
        rtcMinPort: 2000,
        rtcMaxPort: 2020, //워커 포트
    })
    console.log(`worker pid ${worker.pid}`)

    // 심각한 문제 발생, 프로그램 종료
    worker.on('died', error => {
        console.error('mediasoup worker has died')
        setTimeout(() => process.exit(1), 2000) // 2초안에 종료
    })

    return worker
}

// 실행시 바로 워커 생성
worker = createWorker()

// 배열 of RtpCapabilities
// https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
// 미디어 수프에서 지원하는 미디어 코덱 목록...
// https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts

//코덱 설정
const mediaCodecs = [
    {
        kind: 'audio',
        mimeType: 'audio/opus',
        clockRate: 48000,
        channels: 2,
    },
    {
        kind: 'video',
        mimeType: 'video/VP8',
        clockRate: 90000,
        parameters: {
        'x-google-start-bitrate': 1000,
        },
    },
]
// 여기까지가 기본 설정

//소켓 연결
connections.on('connection', async socket => {
    console.log(socket.id)

    //첫 연결 soket Id 보내기
    socket.emit('connection-success', {
        socketId: socket.id
    })

    //첫 연결 juror soket Id 보내기
    socket.emit('connection-success-juror', {
        socketId: socket.id
    })

    //소켓 연결 제거하기 함수
    const removeItems = (items, socketId, type) => {
        items.forEach(item => {
            if (item.socketId === socket.id) {
                item[type].close()
            }
        })
        items = items.filter(item => item.socketId !== socket.id)
    
        return items
        }

    //연결 해제시 transports 제거하기
    socket.on('disconnect', () => {
        console.log('peer disconnected')
        consumers = removeItems(consumers, socket.id, 'consumer')
        producers = removeItems(producers, socket.id, 'producer')
        transports = removeItems(transports, socket.id, 'transport')

        const { roomName } = peers[socket.id]
        delete peers[socket.id]

        //방에서 소켓 제거
        rooms[roomName] = {
            router: rooms[roomName].router,
            peers: rooms[roomName].peers.filter(socketId => socketId !== socket.id)
        }
    })


    ///////////////////////////////////////////////
    socket.on('joinRoom', async ({ roomName }, callback) => {
        // 라우터가 없으면 생성해야함
        // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
        try{
            const router1 = await createRoom(roomName, socket.id)
    
        peers[socket.id] = {
            socket,
            roomName,           // Peer가 접속한 router의 이름
            transports: [],
            producers: [],
            consumers: [],
            peerDetails: {
                name: '',
                isAdmin: false,   // Is this Peer the Admin?
            }
        }

        // get Router RTP Capabilities
        const rtpCapabilities = router1.rtpCapabilities

        // callback으로 rtpCapabilities 전송
        callback({ rtpCapabilities })

        } catch {
            console.log("joinRoom 소켓 에러");
            console.log(error)
            console.log("-----------");
        }
    })

    //newJuror
    socket.on('newJuror', async ({ roomName }, callback) => {
        // 라우터가 없으면 생성해야함
        // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
        try{
            const router1 = await createRoom(roomName, socket.id)
    
        peers[socket.id] = {
            socket,
            roomName,           // Peer가 접속한 router의 이름
            transports: [],
            producers: [],
            consumers: [],
            peerDetails: {
                name: '',
                isAdmin: false,   // Is this Peer the Admin?
            }
        }

        // get Router RTP Capabilities
        const rtpCapabilities = router1.rtpCapabilities

        // callback으로 rtpCapabilities 전송
        callback({ rtpCapabilities })

        } catch {
            console.log("joinRoom 소켓 에러");
            console.log(error)
            console.log("-----------");
        }
    })

    // 방 생성
    const createRoom = async (roomName, socketId) => {
        let router1
        let peers = []
        if (rooms[roomName]) {
            router1 = rooms[roomName].router
            peers = rooms[roomName].peers || []
        } else {
            // 라우터가 없어서 새로 생성
            router1 = await worker.createRouter({ mediaCodecs, })
        }
        
        console.log(`Router ID: ${router1.id}`, peers.length)
    
        rooms[roomName] = {
            router: router1,
            peers: [...peers, socketId],
        }
    
        return router1
        }
    

        // Transport 생성
        socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
            // Peer's properties에서 roomName받기
            const roomName = peers[socket.id].roomName
        
            // get Router (Room) object this peer is in based on RoomName
            const router = rooms[roomName].router
        
        
            //Transport만들기
            createWebRtcTransport(router).then(
                transport => {
                    callback({
                        params: {
                            id: transport.id,
                            iceParameters: transport.iceParameters,
                            iceCandidates: transport.iceCandidates,
                            dtlsParameters: transport.dtlsParameters,
                        }
                    })
        
                    // transport에 Peer's properties 추가
                    addTransport(transport, roomName, consumer)
                },
                error => {
                    console.log(error)
                })
            })
        
            // transport에 Peer's properties 추가
            const addTransport = (transport, roomName, consumer) => {
        
            transports = [
                ...transports,
                { socketId: socket.id, transport, roomName, consumer, }
                ]
            peers[socket.id] = {
                ...peers[socket.id],
                transports: [
                    ...peers[socket.id].transports,
                    transport.id,
                ]
                }
            }
        

            //producer추가
            const addProducer = (producer, roomName) => {
                producers = [
                    ...producers,
                    { socketId: socket.id, producer, roomName, }
                ]
        
                peers[socket.id] = {
                    ...peers[socket.id],
                    producers: [
                        ...peers[socket.id].producers,
                        producer.id,
                    ]
                }
            }
        
            //consumer 추가
            const addConsumer = (consumer, roomName) => {
                // add the consumer to the consumers list
                consumers = [
                    ...consumers,
                    { socketId: socket.id, consumer, roomName, }
                ]
        
                // add the consumer id to the peers list
                peers[socket.id] = {
                    ...peers[socket.id],
                    consumers: [
                        ...peers[socket.id].consumers,
                        consumer.id,
                    ]
                }
            }
        
            // 모든 transports 전송
            socket.on('getProducers', callback => {
                const { roomName } = peers[socket.id]
        
                let producerList = []
                producers.forEach(producerData => {
                    if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
                        producerList = [...producerList, producerData.producer.id]
                    }
                })
        
            // producer list를 client에게 전송
            callback(producerList)
            })
        
            const informConsumers = (roomName, socketId, id) => {
                console.log(`just joined, id ${id} ${roomName}, ${socketId}`)
                // A new producer just joined
                // let all consumers to consume this producer
                producers.forEach(producerData => {
                    if (producerData.socketId !== socketId && producerData.roomName === roomName) {
                        const producerSocket = peers[producerData.socketId].socket
                        // use socket to send producer id to producer
                        producerSocket.emit('new-producer', { producerId: id })
                    }
                })
            }
        
            const getTransport = (socketId) => {
                const [producerTransport] = transports.filter(transport => transport.socketId === socketId && !transport.consumer)
                //console.log(producerTransport.transport)
                return producerTransport.transport
            }
        
            // 첫 transport.products 호출이 발생할 때
            // dtlsParameter을 기반으로 transrpot를 연결시켜줌
            socket.on('transport-connect', ({ dtlsParameters }) => {
                console.log('DTLS PARAMS... ', { dtlsParameters })
            
                getTransport(socket.id).connect({ dtlsParameters })
            })
        
            // produce의 transport가 연결되면
            // client에서 producer id 보내줌
            socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
                const producer = await getTransport(socket.id).produce({
                    kind,
                    rtpParameters,
                })
        
                // add producer to the producers array
                const { roomName } = peers[socket.id]
        
                addProducer(producer, roomName)
        
                informConsumers(roomName, socket.id, producer.id)
        
                console.log('Producer ID: ', producer.id, producer.kind)
        
                producer.on('transportclose', () => {
                    console.log('transport for this producer closed ')
                    producer.close()
                })
        
                // 방에 producer가 있는지 담아서 보냄 (방만든이인지 아닌지)
                callback({
                    id: producer.id,
                    producersExist: producers.length>1 ? true : false
                })
            })
        
            // see client's socket.emit('transport-recv-connect', ...)
            socket.on('transport-recv-connect', async ({ dtlsParameters, serverConsumerTransportId }) => {
                console.log(`DTLS PARAMS: ${dtlsParameters}`)
                const consumerTransport = transports.find(transportData => (
                    transportData.consumer && transportData.transport.id == serverConsumerTransportId
                )).transport
                await consumerTransport.connect({ dtlsParameters })
            })
        
            socket.on('consume', async ({ rtpCapabilities, remoteProducerId, serverConsumerTransportId }, callback) => {
                try {
        
                    const { roomName } = peers[socket.id]
                    const router = rooms[roomName].router
                    let consumerTransport = transports.find(transportData => (
                        transportData.consumer && transportData.transport.id == serverConsumerTransportId
                    )).transport
        
                    // check if the router can consume the specified producer
                    if (router.canConsume({
                        producerId: remoteProducerId,
                        rtpCapabilities
                        })) {
                            // transport can now consume and return a consumer
                            const consumer = await consumerTransport.consume({
                                producerId: remoteProducerId,
                                rtpCapabilities,
                                paused: true,
                            })
        
                        consumer.on('transportclose', () => {
                            console.log('transport close from consumer')
                            })
        
                        consumer.on('producerclose', () => {
                        console.log('producer of consumer closed')
                        socket.emit('producer-closed', { remoteProducerId })
        
                        consumerTransport.close([])
                        transports = transports.filter(transportData => transportData.transport.id !== consumerTransport.id)
                        consumer.close()
                        consumers = consumers.filter(consumerData => consumerData.consumer.id !== consumer.id)
                        })
        
                        addConsumer(consumer, roomName)
        
                        // from the consumer extract the following params
                        // to send back to the Client
                        const params = {
                            id: consumer.id,
                            producerId: remoteProducerId,
                            kind: consumer.kind,
                            rtpParameters: consumer.rtpParameters,
                            serverConsumerId: consumer.id,
                        }
        
                        // send the parameters to the client
                        callback({ params })
                    }
                } catch (error) {
                    console.log(error.message)
                    callback({
                        params: {
                            error: error
                        }
                    })
                }
            })
        
            socket.on('consumer-resume', async ({ serverConsumerId }) => {
                console.log('consumer resume')
                const { consumer } = consumers.find(consumerData => consumerData.consumer.id === serverConsumerId)
                console.log('-------------1');
                console.log(consumer);
                console.log('-------------2');
                await consumer.resume()
            })
        })
        
        let listenip;
        let announceip;
        if (process.platform === "linux") {
            listenip = "0.0.0.0";
            // announceip = "13.125.209.139";
            announceip = 'docker';//'172.31.4.169'; //'13.125.209.139';//"172.17.0.1"; // "54.180.220.160" //기본 퍼블릭 "15.164.205.97"
            //VPC IPv4 CIDR "172.31.0.0/16" //Docker 기본 port "127.17.0.1"
        } else {
            listenip = "127.0.0.1";
            announceip = null;
        }
        console.log("🎧 listenip is : ", listenip);
        console.log("announceip = ", announceip);
        
        
        const createWebRtcTransport = async (router) => {
            return new Promise(async (resolve, reject) => {
                try {
                    // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
                    const webRtcTransport_options = {
                    listenIps: [
                        {
                            ip: listenip, // replace with relevant IP address
                            announcedIp: announceip,
                        }
                    ],
                    enableUdp: true,
                    enableTcp: true,
                    preferUdp: true,
                    }
        
                // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
                let transport = await router.createWebRtcTransport(webRtcTransport_options)
                console.log(`transport id: ${transport.id}`)
        
                transport.on('dtlsstatechange', dtlsState => {
                    if (dtlsState === 'closed') {
                        transport.close()
                    }
                })
        
                transport.on('close', () => {
                    console.log('transport closed')
                })
        
                resolve(transport)
        
                } catch (error) {
                    reject(error)
                }
            })
        }
};
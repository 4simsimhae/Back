// const express = require('express');
// const router = express.Router();

// const https = require('httpolyglot');
// const fs = require('fs');
// const path = require('path');
// const _dirname = path.resolve()

//const { Server } = require('socket.io');
const mediasoup = require('mediasoup');

// router.get('/', (req, res) => {
//         res.send('Hello from mediasoup app!')
//     })

//정적파일 미들웨어 (public폴더)
// router.use('/sfu:room', express.static(path.join(_dirname, 'public')))

// SSL cert for HTTPS access
// const options = {
//     key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
//     cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8')
// }

// const httpsServer = https.createServer(options, router)
// httpsServer.listen(3001, () => {
//     console.log('listening on port: ' + 3001)
// })

// const io = new Server(httpsServer)

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

const createWorker = async () => {
    worker = await mediasoup.createWorker({
        rtcMinPort: 2000,
        rtcMaxPort: 2020,
    })
    console.log(`worker pid ${worker.pid}`)

    worker.on('died', error => {
        // This implies something serious happened, so kill the application
        console.error('mediasoup worker has died')
        setTimeout(() => process.exit(1), 2000) // exit in 2 seconds
    })

    return worker
}

// We create a Worker as soon as our application starts
worker = createWorker()

// This is an Array of RtpCapabilities
// https://mediasoup.org/documentation/v3/mediasoup/rtp-parameters-and-capabilities/#RtpCodecCapability
// list of media codecs supported by mediasoup ...
// https://github.com/versatica/mediasoup/blob/v3/src/supportedRtpCapabilities.ts
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
    socket.emit('connection-success', {
        //소켓 아이디 출력
        socketId: socket.id
    })

    const removeItems = (items, socketId, type) => {
        items.forEach(item => {
            if (item.socketId === socket.id) {
                item[type].close()
            }
        })
        items = items.filter(item => item.socketId !== socket.id)
    
        return items
        }

    socket.on('disconnect', () => {
        // do some cleanup
        console.log('peer disconnected')
        consumers = removeItems(consumers, socket.id, 'consumer')
        producers = removeItems(producers, socket.id, 'producer')
        transports = removeItems(transports, socket.id, 'transport')

        const { roomName } = peers[socket.id]
        delete peers[socket.id]

    // remove socket from room
        rooms[roomName] = {
            router: rooms[roomName].router,
            peers: rooms[roomName].peers.filter(socketId => socketId !== socket.id)
        }
    })

    socket.on('joinRoom', async ({ roomName }, callback) => {
        // create Router if it does not exist
        // const router1 = rooms[roomName] && rooms[roomName].get('data').router || await createRoom(roomName, socket.id)
        const router1 = await createRoom(roomName, socket.id)
    
        peers[socket.id] = {
            socket,
            roomName,           // Name for the Router this Peer joined
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

        // call callback from the client and send back the rtpCapabilities
        callback({ rtpCapabilities })
    })

    const createRoom = async (roomName, socketId) => {
        // worker.createRouter(options)
        // options = { mediaCodecs, appData }
        // mediaCodecs -> defined above
        // appData -> custom application data - we are not supplying any
        // none of the two are required
        let router1
        let peers = []
        if (rooms[roomName]) {
            router1 = rooms[roomName].router
            peers = rooms[roomName].peers || []
        } else {
            router1 = await worker.createRouter({ mediaCodecs, })
        }
        
        console.log(`Router ID: ${router1.id}`, peers.length)
    
        rooms[roomName] = {
            router: router1,
            peers: [...peers, socketId],
        }
    
        return router1
        }
    

        socket.on('createWebRtcTransport', async ({ consumer }, callback) => {
            // get Room Name from Peer's properties
            const roomName = peers[socket.id].roomName
        
            // get Router (Room) object this peer is in based on RoomName
            const router = rooms[roomName].router
        
        
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
        
                    // add transport to Peer's properties
                    addTransport(transport, roomName, consumer)
                },
                error => {
                    console.log(error)
                })
            })
        
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
        
            socket.on('getProducers', callback => {
                //return all producer transports
                const { roomName } = peers[socket.id]
        
                let producerList = []
                producers.forEach(producerData => {
                    if (producerData.socketId !== socket.id && producerData.roomName === roomName) {
                        producerList = [...producerList, producerData.producer.id]
                    }
                })
        
            // return the producer list back to the client
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
        
            // see client's socket.emit('transport-connect', ...)
            socket.on('transport-connect', ({ dtlsParameters }) => {
                console.log('DTLS PARAMS... ', { dtlsParameters })
            
                getTransport(socket.id).connect({ dtlsParameters })
            })
        
            // see client's socket.emit('transport-produce', ...)
            socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
                // call produce based on the prameters from the client
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
        
                // Send back to the client the Producer's id
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
            announceip = "172.31.0.0/16"; 
            //"3.39.21.142" //인스턴스 퍼블릭 "3.39.254.76" //인스턴스 프라이빗 "172.31.12.132" //VPC IPv4 CIDR "172.31.0.0/16"
        } else {
            listenip = "127.0.0.1";
            announceip = null;
        }
        console.log("🎧 listenip is : ", listenip);
        
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
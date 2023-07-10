const express = require('express');
const router = express.Router();

const https = require('httpolyglot');
const fs = require('fs');
const path = require('path');
const _dirname = path.resolve()

const { Server } = require('socket.io');
const mediasoup = require('mediasoup');

router.get('/', (req, res) => {
        res.send('Hello from mediasoup app!')
    })

//정적파일 미들웨어 (public폴더)
router.use('/sfu', express.static(path.join(_dirname, 'public')))

// SSL cert for HTTPS access
const options = {
    key: fs.readFileSync('./server/ssl/key.pem', 'utf-8'),
    cert: fs.readFileSync('./server/ssl/cert.pem', 'utf-8')
}

const httpsServer = https.createServer(options, router)
httpsServer.listen(3001, () => {
    console.log('listening on port: ' + 3001)
})

const io = new Server(httpsServer)

// socket.io namespace (could represent a room?)
const peers = io.of('/mediasoup')


/**
 * Worker
 * |-> Router(s)
 *     |-> Producer Transport(s)
 *         |-> Producer
 *     |-> Consumer Transport(s)
 *         |-> Consumer 
 **/
let worker
let Router //바뀜 주의
let producerTransport
let consumerTransport
let producer
let consumer

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
peers.on('connection', async socket => {
    //소켓 연결시 socket.id console
    console.log(socket.id)
    socket.emit('connection-success', {
        socketId: socket.id
    })

    //소켓 해제시 해제 console
    socket.on('disconnect', () => {
        // do some cleanup
        console.log('peer disconnected')
    })

    // worker.createRouter(options)
    // options = { mediaCodecs, appData }
    // mediaCodecs -> defined above
    // appData -> custom application data - we are not supplying any
    // none of the two are required
    Router = await worker.createRouter({ mediaCodecs, })

    // Client emits a request for RTP Capabilities
    // This event responds to the request
    socket.on('getRtpCapabilities', (callback) => {

        const rtpCapabilities = Router.rtpCapabilities

        console.log('rtp Capabilities', rtpCapabilities)

        // call callback from the client and send back the rtpCapabilities
        callback({ rtpCapabilities })
    })

    // Client emits a request to create server side Transport
    // We need to differentiate between the producer and consumer transports
    socket.on('createWebRtcTransport', async ({ sender }, callback) => {
        console.log(`Is this a sender request? ${sender}`)
        // The client indicates if it is a producer or a consumer
        // if sender is true, indicates a producer else a consumer
        if (sender)
        producerTransport = await createWebRtcTransport(callback)
        else
        consumerTransport = await createWebRtcTransport(callback)
    })

    // see client's socket.emit('transport-connect', ...)
    socket.on('transport-connect', async ({ dtlsParameters }) => {
        console.log('DTLS PARAMS... ', { dtlsParameters })
        await producerTransport.connect({ dtlsParameters })
    })

    // see client's socket.emit('transport-produce', ...)
    socket.on('transport-produce', async ({ kind, rtpParameters, appData }, callback) => {
        // call produce based on the prameters from the client
        producer = await producerTransport.produce({
        kind,
        rtpParameters,
        })

        console.log('Producer ID: ', producer.id, producer.kind)

        producer.on('transportclose', () => {
        console.log('transport for this producer closed ')
        producer.close()
        })

        // Send back to the client the Producer's id
        callback({
        id: producer.id
        })
    })

    // see client's socket.emit('transport-recv-connect', ...)
    socket.on('transport-recv-connect', async ({ dtlsParameters }) => {
        console.log(`DTLS PARAMS: ${dtlsParameters}`)
        await consumerTransport.connect({ dtlsParameters })
    })

    socket.on('consume', async ({ rtpCapabilities }, callback) => {
        try {
        // check if the router can consume the specified producer
        if (Router.canConsume({
            producerId: producer.id,
            rtpCapabilities
        })) {
            // transport can now consume and return a consumer
            consumer = await consumerTransport.consume({
            producerId: producer.id,
            rtpCapabilities,
            paused: true,
            })

            consumer.on('transportclose', () => {
            console.log('transport close from consumer')
            })

            consumer.on('producerclose', () => {
            console.log('producer of consumer closed')
            })

            // from the consumer extract the following params
            // to send back to the Client
            const params = {
            id: consumer.id,
            producerId: producer.id,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
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

    socket.on('consumer-resume', async () => {
        console.log('consumer resume')
        await consumer.resume()
    })
});

const createWebRtcTransport = async (callback) => {
    try {
        // https://mediasoup.org/documentation/v3/mediasoup/api/#WebRtcTransportOptions
        const webRtcTransport_options = {
            listenIps: [
            {
                ip: '0.0.0.0', // replace with relevant IP address
                announcedIp: '127.0.0.1',
            }
            ],
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
        }

        // https://mediasoup.org/documentation/v3/mediasoup/api/#router-createWebRtcTransport
        let transport = await Router.createWebRtcTransport(webRtcTransport_options)
        console.log(`transport id: ${transport.id}`)

        transport.on('dtlsstatechange', dtlsState => {
            if (dtlsState === 'closed') {
                transport.close()
            }
        })

        transport.on('close', () => {
            console.log('transport closed')
        })

        // send back to the client the following prameters
        callback({
            // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
            params: {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            }
        })

        return transport

        } catch (error) {
            console.log(error)
            callback({
                params: {
                    error: error
                }
            })
        }
}

module.exports = router;
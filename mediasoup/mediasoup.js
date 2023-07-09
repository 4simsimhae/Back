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
let routers //바뀜 주의
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
});

module.exports = router;
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Serve static files (if needed)
// app.use(express.static('public'));

// Serve HTML from root
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WebRTC Audio Call</title>
        </head>
        <body>
            <h1>WebRTC Audio Call</h1>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                let localStream;
                let peerConnection;
                const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

                async function start() {
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioTracks = localStream.getAudioTracks();
                    console.log('Using audio device: ' + audioTracks[0].label);

                    socket.on('offer', async (offer) => {
                        if (!peerConnection) {
                            peerConnection = new RTCPeerConnection(config);
                            peerConnection.addStream(localStream);

                            peerConnection.ontrack = (event) => {
                                // Play the incoming audio stream
                                const remoteAudio = new Audio();
                                remoteAudio.srcObject = event.streams[0];
                                remoteAudio.play();
                            };

                            peerConnection.onicecandidate = (event) => {
                                if (event.candidate) {
                                    socket.emit('candidate', event.candidate);
                                }
                            };
                        }

                        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        socket.emit('answer', answer);
                    });

                    socket.on('answer', async (answer) => {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    });

                    socket.on('candidate', (candidate) => {
                        peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    });

                    // Start the connection by creating an offer
                    peerConnection = new RTCPeerConnection(config);
                    peerConnection.addStream(localStream);
                    peerConnection.ontrack = (event) => {
                        const remoteAudio = new Audio();
                        remoteAudio.srcObject = event.streams[0];
                        remoteAudio.play();
                    };
                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate) {
                            socket.emit('candidate', event.candidate);
                        }
                    };

                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    socket.emit('offer', offer);
                }

                start();
            </script>
        </body>
        </html>
    `);
});

// WebSocket handling
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Relay offer from one peer to another
    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    // Relay answer from one peer to another
    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    // Relay ICE candidate from one peer to another
    socket.on('candidate', (candidate) => {
        socket.broadcast.emit('candidate', candidate);
    });
});

http.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on port 3000');
});

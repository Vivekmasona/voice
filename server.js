const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

// Serve HTML with room functionality
app.get('/:roomID', (req, res) => {
    const roomID = req.params.roomID;
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>WebRTC Audio Call - Room: ${roomID}</title>
        </head>
        <body>
            <h1>WebRTC Audio Call - Room: ${roomID}</h1>
            <script src="/socket.io/socket.io.js"></script>
            <script>
                const socket = io();
                let localStream;
                let peerConnection;
                const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

                async function start() {
                    // Get user media (audio only)
                    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioTracks = localStream.getAudioTracks();
                    console.log('Using audio device: ' + audioTracks[0].label);

                    // Join the room
                    const roomID = "${roomID}";
                    socket.emit('join', roomID);

                    // Handle incoming offer
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
                                    socket.emit('candidate', { candidate: event.candidate, roomID });
                                }
                            };
                        }

                        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                        const answer = await peerConnection.createAnswer();
                        await peerConnection.setLocalDescription(answer);
                        socket.emit('answer', { answer, roomID });
                    });

                    // Handle incoming answer
                    socket.on('answer', async (answer) => {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                    });

                    // Handle incoming ICE candidates
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
                            socket.emit('candidate', { candidate: event.candidate, roomID });
                        }
                    };

                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    socket.emit('offer', { offer, roomID });
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

    // Join a specific room
    socket.on('join', (roomID) => {
        socket.join(roomID);
        console.log(`User joined room: ${roomID}`);
    });

    // Relay offer from one peer to another in the same room
    socket.on('offer', ({ offer, roomID }) => {
        socket.to(roomID).emit('offer', offer);
    });

    // Relay answer from one peer to another in the same room
    socket.on('answer', ({ answer, roomID }) => {
        socket.to(roomID).emit('answer', answer);
    });

    // Relay ICE candidate from one peer to another in the same room
    socket.on('candidate', ({ candidate, roomID }) => {
        socket.to(roomID).emit('candidate', candidate);
    });
});

// Start the server
http.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on port 3000');
});

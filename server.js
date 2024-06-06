const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

app.get('/broadcaster', (req, res) => {
    res.sendFile(__dirname + '/public/broadcaster.html');
});

app.get('/listener', (req, res) => {
    res.sendFile(__dirname + '/public/listener.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
    
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('candidate', (candidate) => {
        socket.broadcast.emit('candidate', candidate);
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});

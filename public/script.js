const socket = io();
let localStream;
let mediaRecorder;
let audioChunks = [];

const micButton = document.getElementById('micButton');
let isMicEnabled = false;

micButton.onclick = async () => {
    if (!isMicEnabled) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            mediaRecorder = new MediaRecorder(localStream);
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                    if (mediaRecorder.state == "inactive") {
                        let blob = new Blob(audioChunks, { type: 'audio/webm' });
                        socket.emit('audio', blob);
                        audioChunks = [];
                    }
                }
            };

            mediaRecorder.start(1000); // Record in chunks of 1 second
            micButton.textContent = "Disable Microphone";
            isMicEnabled = true;
        } catch (err) {
            console.error('Error accessing media devices.', err);
        }
    } else {
        mediaRecorder.stop();
        localStream.getTracks().forEach(track => track.stop());
        micButton.textContent = "Enable Microphone";
        isMicEnabled = false;
    }
};

socket.on('audio', (data) => {
    const audio = new Audio(URL.createObjectURL(data));
    audio.play();
});

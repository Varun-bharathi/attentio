const { Server } = require("socket.io");
const { analyzeFrame } = require('./ai_runner');

let io;
const meetings = {}; // link -> [sids]
const participants = {}; // sid -> { link, user }

function initSockets(server) {
    io = new Server(server, { cors: { origin: '*', methods: ['*'] } });

    io.on('connection', (socket) => {
        console.log('Socket connected:', socket.id);

        socket.on('join_request', (data) => {
            const { meeting_link, user } = data;
            // Send request to the host/faculty who is already in the room
            socket.broadcast.to(meeting_link).emit('student_join_request', { sid: socket.id, user, meeting_link });
        });

        socket.on('admit_student', (data) => {
            const { sid, meeting_link } = data;
            io.to(sid).emit('join_accepted', { meeting_link });
        });

        socket.on('deny_student', (data) => {
            const { sid } = data;
            io.to(sid).emit('join_denied');
        });

        socket.on('join_meeting', (data) => {
            const { meeting_link, user } = data;
            socket.join(meeting_link);

            if (!meetings[meeting_link]) meetings[meeting_link] = [];
            meetings[meeting_link].push(socket.id);
            participants[socket.id] = { meeting_link, user };

            socket.broadcast.to(meeting_link).emit('student_joined', { sid: socket.id, user });
        });

        socket.on('send_frame', (data) => {
            const participant = participants[socket.id];
            if (participant && participant.meeting_link) {
                if (data.frame) {
                    analyzeFrame(socket.id, data.frame);
                }
            }
        });

        socket.on('offer', (data) => {
            socket.to(data.target).emit('offer', { sdp: data.sdp, caller: socket.id });
        });

        socket.on('answer', (data) => {
            socket.to(data.target).emit('answer', { sdp: data.sdp, callee: socket.id });
        });

        socket.on('ice_candidate', (data) => {
            socket.to(data.target).emit('ice_candidate', { candidate: data.candidate, sender: socket.id });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected:', socket.id);
            const participant = participants[socket.id];
            if (participant) {
                const { meeting_link } = participant;
                const list = meetings[meeting_link];
                if (list) {
                    const index = list.indexOf(socket.id);
                    if (index !== -1) list.splice(index, 1);
                }
                io.to(meeting_link).emit('student_left', { sid: socket.id });
                delete participants[socket.id];
            }
        });
    });
}

function broadcastAttentionUpdate(sid, result) {
    if (!io) return;
    const participant = participants[sid];
    if (participant && participant.meeting_link && participant.user) {
        io.to(participant.meeting_link).emit('attention_update', {
            sid,
            user: participant.user,
            stats: result
        });
    }
}

module.exports = { initSockets, broadcastAttentionUpdate };

const express = require('express');
const cors = require('cors');
const http = require('http');
const { sequelize } = require('./db');
const { router: authRouter } = require('./routes/auth');
const meetingRouter = require('./routes/meeting');
const analyticsRouter = require('./routes/analytics');
const { initSockets, broadcastAttentionUpdate } = require('./sockets');
const { startAI, stopAI } = require('./ai_runner');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/meeting', meetingRouter);
app.use('/api/analytics', analyticsRouter);

// Database initialization
sequelize.sync().then(() => {
    console.log('Database synced');
}).catch(err => {
    console.error('Failed to sync database:', err);
});

// Setup sockets for meeting streams
initSockets(server);

// Boot up Node Server and the AI service together
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);

    // Start python AI child process loop
    startAI((sid, result) => {
        // Pipeline incoming JSON events from PyChild Process back to sockets
        broadcastAttentionUpdate(sid, result);
    });
});

process.on('SIGINT', () => {
    stopAI();
    process.exit();
});
process.on('SIGTERM', () => {
    stopAI();
    process.exit();
});

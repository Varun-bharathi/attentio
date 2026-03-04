const express = require('express');
const crypto = require('crypto');
const { Meeting, MeetingParticipant } = require('../db');
const { authMiddleware } = require('./auth');

const router = express.Router();

router.post('/create', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ detail: "Only faculty can create meetings" });
        }

        const title = req.query.title || 'Untitled Meeting';
        const meeting_link = crypto.randomUUID();

        const new_meeting = await Meeting.create({
            title,
            meeting_link,
            faculty_id: req.user.id
        });

        res.json({ id: new_meeting.id, meeting_link: new_meeting.meeting_link, title: new_meeting.title });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/join', authMiddleware, async (req, res) => {
    try {
        const { meeting_link } = req.body;
        const meeting = await Meeting.findOne({ where: { meeting_link, status: 'active' } });

        if (!meeting) {
            return res.status(404).json({ detail: "Meeting not found or inactive" });
        }

        if (req.user.role === 'student') {
            const participant = await MeetingParticipant.findOne({ where: { meeting_id: meeting.id, student_id: req.user.id } });
            if (!participant) {
                await MeetingParticipant.create({ meeting_id: meeting.id, student_id: req.user.id });
            }
        }

        res.json({ message: "Joined successfully", meeting_id: meeting.id, title: meeting.title });
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.get('/active', authMiddleware, async (req, res) => {
    try {
        if (req.user.role === 'faculty') {
            const meetings = await Meeting.findAll({ where: { faculty_id: req.user.id } });
            res.json(meetings);
        } else {
            const meetings = await Meeting.findAll({ where: { status: 'active' } });
            res.json(meetings);
        }
    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

module.exports = router;

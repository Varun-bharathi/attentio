const express = require('express');
const crypto = require('crypto');
const { Meeting, MeetingParticipant, User } = require('../db');
const { authMiddleware } = require('./auth');
const { sendPeriodicReport, sendSummaryReport } = require('../mailer');

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
        let { meeting_link } = req.body;
        meeting_link = meeting_link ? meeting_link.trim() : '';
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
router.post('/end', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ detail: "Only faculty can end meetings" });
        }

        const { meeting_link, stats } = req.body;
        const meeting = await Meeting.findOne({ where: { meeting_link, faculty_id: req.user.id } });

        if (!meeting) {
            return res.status(404).json({ detail: "Meeting not found" });
        }

        meeting.status = 'ended';
        await meeting.save();

        res.json({ message: "Meeting ended successfully." });

    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/meeting/report  — called by student every 1 minute with latest stats
router.post('/report', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ detail: "Only students can send reports" });
        }

        const { meeting_link, stats } = req.body;
        if (!meeting_link || !stats) {
            return res.status(400).json({ detail: "meeting_link and stats are required" });
        }

        // Find the meeting and the faculty
        const meeting = await Meeting.findOne({ where: { meeting_link } });
        if (!meeting) return res.status(404).json({ detail: "Meeting not found" });

        const faculty = await User.findOne({ where: { id: meeting.faculty_id } });
        if (!faculty) return res.status(404).json({ detail: "Faculty not found" });

        await sendPeriodicReport({
            facultyEmail: faculty.email,
            facultyName: faculty.name,
            studentName: req.user.name,
            meetingTitle: meeting.title,
            stats
        });

        res.json({ message: "Periodic report sent successfully" });
    } catch (error) {
        console.error("Report email error:", error.message);
        res.status(500).json({ detail: error.message });
    }
});

// POST /api/meeting/leave  — called when student clicks Leave Meeting; sends full summary
router.post('/leave', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ detail: "Only students trigger leave reports" });
        }

        const { meeting_link, sessionStart, allStats } = req.body;
        if (!meeting_link) {
            return res.status(400).json({ detail: "meeting_link is required" });
        }

        const meeting = await Meeting.findOne({ where: { meeting_link } });
        if (!meeting) return res.status(404).json({ detail: "Meeting not found" });

        const faculty = await User.findOne({ where: { id: meeting.faculty_id } });
        if (!faculty) return res.status(404).json({ detail: "Faculty not found" });

        await sendSummaryReport({
            facultyEmail: faculty.email,
            facultyName: faculty.name,
            studentName: req.user.name,
            meetingTitle: meeting.title,
            sessionStart: sessionStart || new Date().toISOString(),
            allStats: allStats || []
        });

        res.json({ message: "Summary report sent successfully" });
    } catch (error) {
        console.error("Leave summary email error:", error.message);
        res.status(500).json({ detail: error.message });
    }
});

// DELETE /api/meeting/:meeting_link - called by faculty to delete a meeting
router.delete('/:meeting_link', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ detail: "Only faculty can delete meetings" });
        }

        const { meeting_link } = req.params;
        const meeting = await Meeting.findOne({ where: { meeting_link, faculty_id: req.user.id } });

        if (!meeting) {
            return res.status(404).json({ detail: "Meeting not found or you are not authorized to delete it" });
        }

        // Delete associated participants
        await MeetingParticipant.destroy({ where: { meeting_id: meeting.id } });
        // Delete the meeting
        await meeting.destroy();

        res.json({ message: "Meeting deleted successfully" });
    } catch (error) {
        console.error("Delete meeting error:", error.message);
        res.status(500).json({ detail: error.message });
    }
});

module.exports = router;


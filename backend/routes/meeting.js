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

        let reportText = `Dear Faculty,\n\nHere is the comprehensive Attention Analytics Report for the recently concluded class session (${meeting.title} - ${meeting_link}).\n\n`;

        if (!stats || Object.keys(stats).length === 0) {
            reportText += "No student analytics were recorded during this session.\n\n";
        } else {
            Object.values(stats).forEach(student => {
                reportText += `Student: ${student.name}\n`;
                reportText += `Average Attention Score: ${student.attention}%\n`;
                reportText += `Latest Posture: ${student.posture || 'N/A'}\n`;
                reportText += `Latest Gesture: ${student.gesture || 'N/A'}\n`;
                reportText += `Latest Expression & Gaze: ${student.emotion || student.gaze || 'N/A'}\n\n`;
            });
        }
        reportText += `Best regards,\nAttentio AI System`;

        const nodemailer = require('nodemailer');
        try {
            console.log('[Email] Attempting to send END-SESSION report...');
            console.log('[Email] SMTP_USER:', process.env.SMTP_USER);
            console.log('[Email] SMTP_TO:', process.env.SMTP_TO || req.user.email);
            console.log('[Email] SMTP_PASS set?', !!process.env.SMTP_PASS);

            // Configure nodemailer
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            if (!process.env.SMTP_PASS) {
                console.error("[Email] SMTP_PASS is missing in .env. Email will NOT be sent.");
            } else {
                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: process.env.SMTP_TO || req.user.email,
                    subject: `Attentio: Automated Score Report for Class ${meeting.title}`,
                    text: reportText
                };

                await transporter.sendMail(mailOptions);
                console.log('[Email] End-session email sent successfully to', mailOptions.to);
            }
        } catch (err) {
            console.error(`[Email] Failed to send end-session email:`, err.message);
            console.error(`[Email] Full error:`, err);
        } finally {
            res.json({ message: "Meeting ended and report processed!" });
        }

    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/report', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'faculty') {
            return res.status(403).json({ detail: "Only faculty can generate mid-session reports" });
        }

        const { meeting_link, stats } = req.body;
        const meeting = await Meeting.findOne({ where: { meeting_link, faculty_id: req.user.id } });

        if (!meeting) {
            return res.status(404).json({ detail: "Meeting not found" });
        }

        let reportText = `Dear Faculty,\n\nHere is the mid-session Attention Analytics Report for your ongoing class (${meeting.title} - ${meeting_link}).\n\nThis is an automated 1-minute update.\n\n`;

        if (!stats || Object.keys(stats).length === 0) {
            reportText += "No student analytics were recorded so far.\n\n";
        } else {
            Object.values(stats).forEach(student => {
                reportText += `Student: ${student.name}\n`;
                reportText += `Current Attention Score: ${student.attention}%\n`;
                reportText += `Latest Posture: ${student.posture || 'N/A'}\n`;
                reportText += `Latest Gesture: ${student.gesture || 'N/A'}\n`;
                reportText += `Latest Expression & Gaze: ${student.emotion || student.gaze || 'N/A'}\n\n`;
            });
        }
        reportText += `Best regards,\nAttentio AI System`;

        const nodemailer = require('nodemailer');
        try {
            console.log('[Email] Attempting to send MID-SESSION report...');
            console.log('[Email] SMTP_USER:', process.env.SMTP_USER);
            console.log('[Email] SMTP_TO:', process.env.SMTP_TO || req.user.email);
            console.log('[Email] SMTP_PASS set?', !!process.env.SMTP_PASS);

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            if (!process.env.SMTP_PASS) {
                console.error("[Email] SMTP_PASS is missing in .env. Email will NOT be sent.");
            } else {
                const mailOptions = {
                    from: process.env.SMTP_USER,
                    to: process.env.SMTP_TO || req.user.email,
                    subject: `Attentio: Mid-Session Score Report for Class ${meeting.title}`,
                    text: reportText
                };

                await transporter.sendMail(mailOptions);
                console.log('[Email] Mid-session email sent successfully to', mailOptions.to);
            }
        } catch (err) {
            console.error(`[Email] Failed to send mid-session email:`, err.message);
            console.error(`[Email] Full error:`, err);
        } finally {
            res.json({ message: "Mid-session report processed!" });
        }

    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

module.exports = router;

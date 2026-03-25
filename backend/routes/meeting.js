const express = require('express');
const crypto = require('crypto');
const { Meeting, MeetingParticipant, User } = require('../db');
const { authMiddleware } = require('./auth');
const nodemailer = require('nodemailer');

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

        try {
            const scriptUrl = 'https://script.google.com/macros/s/AKfycbwpxw6ql4JOW9HEvGfUFDH_OsJizlOdZ4JHqJi5YahUdb2wl6ahQgnTIKkFAzguFpM/exec';
            console.log('[Webhook] Sending END-SESSION report to Google Apps Script...');
            const payload = {
                email: req.user.email,
                report: reportText
            };

            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log('[Webhook] End-session report sent successfully.');
                res.json({ message: "Meeting ended and report processed via Webhook!" });
            } else {
                console.error('[Webhook] Failed to send end-session report. Status:', response.status);
                res.status(500).json({ detail: "Meeting ended but failed to send webhook report" });
            }
        } catch (err) {
            console.error(`[Webhook] Network error sending end-session report:`, err.message);
            res.status(500).json({ detail: "Network error sending webhook report" });
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

        try {
            const scriptUrl = 'https://script.google.com/macros/s/AKfycbwpxw6ql4JOW9HEvGfUFDH_OsJizlOdZ4JHqJi5YahUdb2wl6ahQgnTIKkFAzguFpM/exec';
            console.log('[Webhook] Sending MID-SESSION report to Google Apps Script...');
            const payload = {
                email: req.user.email,
                report: reportText
            };

            const response = await fetch(scriptUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log('[Webhook] Mid-session report sent successfully.');
                res.json({ message: "Mid-session report processed via Webhook!" });
            } else {
                console.error('[Webhook] Failed to send mid-session report. Status:', response.status);
                res.status(500).json({ detail: "Failed to send webhook report" });
            }
        } catch (err) {
            console.error(`[Webhook] Network error sending mid-session report:`, err.message);
            res.status(500).json({ detail: "Network error sending webhook report" });
        }

    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

router.post('/student-report', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ detail: "Only students can send their reports" });
        }

        const { meeting_link, stats } = req.body;
        const meeting = await Meeting.findOne({ where: { meeting_link, status: 'active' } });

        if (!meeting) {
            return res.status(404).json({ detail: "Meeting not found" });
        }

        const faculty = await User.findOne({ where: { id: meeting.faculty_id } });
        if (!faculty) {
            return res.status(404).json({ detail: "Faculty not found" });
        }

        let reportText = `Dear ${faculty.name},\n\nHere is my mid-session Attention Analytics Report for the ongoing class (${meeting.title}).\n\n`;

        if (!stats) {
            reportText += "No analytics were recorded for me so far.\n\n";
        } else {
            reportText += `Student: ${req.user.name}\n`;
            reportText += `Current Attention Score: ${stats.attention}%\n`;
            reportText += `Latest Posture: ${stats.posture || 'N/A'}\n`;
            reportText += `Latest Gesture: ${stats.gesture || 'N/A'}\n`;
            reportText += `Latest Expression & Gaze: ${stats.emotion || stats.gaze || 'N/A'}\n\n`;
        }
        reportText += `Best regards,\n${req.user.name}`;

        const scriptUrl = 'https://script.google.com/macros/s/AKfycbwpxw6ql4JOW9HEvGfUFDH_OsJizlOdZ4JHqJi5YahUdb2wl6ahQgnTIKkFAzguFpM/exec';
        console.log('[Webhook] Sending student report to Google Apps Script...');
        
        const payload = {
            email: faculty.email,
            report: reportText
        };

        const response = await fetch(scriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            console.log(`[Webhook] Student report sent successfully via webhook for ${faculty.email}`);
            res.json({ message: "Student report dynamically processed and sent via Webhook!" });
        } else {
            console.error('[Webhook] Failed to send student report. Status:', response.status);
            res.status(500).json({ detail: "Failed to send student report via webhook" });
        }

    } catch (error) {
        console.error(`[Email] Failed to send student report:`, error.message);
        res.status(500).json({ detail: error.message });
    }
});

module.exports = router;

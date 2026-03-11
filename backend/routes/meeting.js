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

        // Generate PDF report
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const path = require('path');
        const { spawn } = require('child_process');

        const pdfPath = path.join(__dirname, '..', `report_${meeting_link}.pdf`);
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        doc.fontSize(24).fillColor('#4f46e5').text(`Class Analytics Report`, { align: 'center' });
        doc.fontSize(14).fillColor('black').text(`Class Title: ${meeting.title}`, { align: 'center' });
        doc.fontSize(12).fillColor('gray').text(`Meeting Link: ${meeting_link}`, { align: 'center' });
        doc.moveDown(2);

        if (!stats || Object.keys(stats).length === 0) {
            doc.fontSize(14).fillColor('black').text("No student analytics were recorded during this session.", { align: 'center' });
        } else {
            Object.values(stats).forEach(student => {
                doc.fontSize(16).fillColor('#2563eb').text(`Student: ${student.name}`);
                doc.fontSize(12).fillColor('black').text(`Average Attention Score: ${student.attention}%`);
                doc.text(`Latest Posture: ${student.posture || 'N/A'}`);
                doc.text(`Latest Gesture: ${student.gesture || 'N/A'}`);
                doc.text(`Latest Expression & Gaze: ${student.emotion || student.gaze || 'N/A'}`);
                doc.moveDown(1);
            });
        }
        doc.end();

        writeStream.on('finish', async () => {
            const nodemailer = require('nodemailer');
            try {
                // Configure nodemailer
                const transporter = nodemailer.createTransport({
                    service: 'gmail', // Assuming gmail like in the python script. This can be adapted based on SMTP_SERVER
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });

                if (!process.env.SMTP_PASS) {
                    console.error("Disclaimer: SMTP_PASS is missing in your .env. Email will NOT be sent. Skipping...");
                } else {
                    const mailOptions = {
                        from: process.env.SMTP_USER,
                        to: process.env.SMTP_TO || req.user.email,
                        subject: `Attentio: Automated Score Report for Class ${meeting_link.substring(0, 8)}`,
                        text: `Dear Faculty,\n\nPlease find attached the comprehensive Attention Analytics Report for the recently concluded class session (${meeting_link}).\n\nThis report contains the average attention scores and behavioral cues for all students present.\n\nBest regards,\nAttentio AI System`,
                        attachments: [
                            {
                                filename: `report_${meeting_link}.pdf`,
                                path: pdfPath
                            }
                        ]
                    };

                    await transporter.sendMail(mailOptions);
                    console.log('Email sent successfully using NodeMailer!');
                }
            } catch (err) {
                console.error(`[NodeMailer Error] Failed to send email:`, err);
            } finally {
                // Optionally delete the generated PDF after sending
                fs.unlink(pdfPath, () => { });
                res.json({ message: "Meeting ended and report processed!" });
            }
        });

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

        // Generate PDF report (Mid-Session)
        const PDFDocument = require('pdfkit');
        const fs = require('fs');
        const path = require('path');

        const pdfPath = path.join(__dirname, '..', `report_${meeting_link}_mid.pdf`);
        const doc = new PDFDocument({ margin: 50 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        doc.fontSize(24).fillColor('#4f46e5').text(`Mid-Session Analytics Report`, { align: 'center' });
        doc.fontSize(14).fillColor('black').text(`Class Title: ${meeting.title}`, { align: 'center' });
        doc.fontSize(12).fillColor('gray').text(`Meeting Link: ${meeting_link}`, { align: 'center' });
        doc.moveDown(2);

        if (!stats || Object.keys(stats).length === 0) {
            doc.fontSize(14).fillColor('black').text("No student analytics were recorded so far.", { align: 'center' });
        } else {
            Object.values(stats).forEach(student => {
                doc.fontSize(16).fillColor('#2563eb').text(`Student: ${student.name}`);
                doc.fontSize(12).fillColor('black').text(`Current Attention Score: ${student.attention}%`);
                doc.text(`Latest Posture: ${student.posture || 'N/A'}`);
                doc.text(`Latest Gesture: ${student.gesture || 'N/A'}`);
                doc.text(`Latest Expression & Gaze: ${student.emotion || student.gaze || 'N/A'}`);
                doc.moveDown(1);
            });
        }
        doc.end();

        writeStream.on('finish', async () => {
            const nodemailer = require('nodemailer');
            try {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: process.env.SMTP_USER,
                        pass: process.env.SMTP_PASS
                    }
                });

                if (!process.env.SMTP_PASS) {
                    console.error("Disclaimer: SMTP_PASS is missing in your .env. Email will NOT be sent.");
                } else {
                    const mailOptions = {
                        from: process.env.SMTP_USER,
                        to: process.env.SMTP_TO || req.user.email,
                        subject: `Attentio: Mid-Session Score Report for Class ${meeting_link.substring(0, 8)}`,
                        text: `Dear Faculty,\n\nPlease find attached the mid-session Attention Analytics Report for your ongoing class (${meeting_link}).\n\nThis is an automated 1-minute update.\n\nBest regards,\nAttentio AI System`,
                        attachments: [
                            {
                                filename: `report_${meeting_link}_mid.pdf`,
                                path: pdfPath
                            }
                        ]
                    };

                    await transporter.sendMail(mailOptions);
                    console.log('Mid-session email sent successfully using NodeMailer!');
                }
            } catch (err) {
                console.error(`[NodeMailer Error] Failed to send email:`, err);
            } finally {
                fs.unlink(pdfPath, () => { });
                res.json({ message: "Mid-session report processed!" });
            }
        });

    } catch (error) {
        res.status(500).json({ detail: error.message });
    }
});

module.exports = router;

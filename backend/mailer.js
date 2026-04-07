const nodemailer = require('nodemailer');
require('dotenv').config();

// Lazy transporter — created on first use so env vars are guaranteed to be loaded
function getTransporter() {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASS
        }
    });
}

/**
 * Send a periodic 1-minute attention report to the faculty.
 */
async function sendPeriodicReport({ facultyEmail, facultyName, studentName, meetingTitle, stats }) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const attentionColor = stats.attention > 75 ? '#22c55e' : stats.attention > 45 ? '#f59e0b' : '#ef4444';
    const attentionLabel = stats.attention > 75 ? 'High' : stats.attention > 45 ? 'Moderate' : 'Low';

    const emotionRows = stats.emotion_distribution
        ? Object.entries(stats.emotion_distribution)
            .map(([emotion, pct]) => `
                <tr>
                    <td style="padding:6px 12px;text-transform:capitalize;color:#94a3b8;">${emotion}</td>
                    <td style="padding:6px 12px;">
                        <div style="background:#1e293b;border-radius:4px;overflow:hidden;width:120px;display:inline-block;vertical-align:middle;">
                            <div style="background:#6366f1;width:${Math.round(pct)}%;height:8px;"></div>
                        </div>
                        <span style="margin-left:8px;color:#e2e8f0;font-size:12px;">${Math.round(pct)}%</span>
                    </td>
                </tr>`)
            .join('')
        : '<tr><td colspan="2" style="color:#64748b;padding:8px 12px;">N/A</td></tr>';

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:600px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.5);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
                <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🎯 Attentio — Live Report</h1>
                <p style="margin:6px 0 0;color:#c7d2fe;font-size:13px;">Periodic attention update · Every 1 minute</p>
            </div>

            <!-- Meta -->
            <div style="padding:24px 32px 0;">
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:140px;">Student</td>
                        <td style="color:#f1f5f9;font-weight:600;font-size:13px;">${studentName}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Session</td>
                        <td style="color:#f1f5f9;font-size:13px;">${meetingTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Date</td>
                        <td style="color:#f1f5f9;font-size:13px;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Time</td>
                        <td style="color:#f1f5f9;font-size:13px;">${timeStr}</td>
                    </tr>
                </table>
            </div>

            <!-- Attention Score -->
            <div style="margin:24px 32px;background:#0f172a;border-radius:12px;padding:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="color:#94a3b8;font-size:13px;font-weight:600;">ATTENTION SCORE</span>
                    <span style="color:${attentionColor};font-size:26px;font-weight:800;">${stats.attention ?? 'N/A'}%</span>
                </div>
                <div style="background:#1e293b;border-radius:8px;overflow:hidden;height:10px;">
                    <div style="background:${attentionColor};width:${stats.attention ?? 0}%;height:100%;border-radius:8px;transition:width 0.3s;"></div>
                </div>
                <div style="margin-top:8px;color:${attentionColor};font-size:12px;font-weight:600;text-align:right;">${attentionLabel} Attention</div>
            </div>

            <!-- Posture -->
            <div style="margin:0 32px 20px;">
                <div style="background:#0f172a;border-radius:12px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#94a3b8;font-size:13px;font-weight:600;">POSTURE SCORE</span>
                    <span style="color:#38bdf8;font-size:18px;font-weight:700;">${stats.posture ?? 'N/A'}</span>
                </div>
            </div>

            <!-- Emotion Distribution -->
            <div style="margin:0 32px 32px;">
                <div style="background:#0f172a;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;font-weight:600;">EMOTION DISTRIBUTION</p>
                    <table style="width:100%;border-collapse:collapse;">
                        ${emotionRows}
                    </table>
                </div>
            </div>

            <!-- Footer -->
            <div style="background:#0f172a;padding:16px 32px;text-align:center;">
                <p style="margin:0;color:#475569;font-size:12px;">This is an automated report from Attentio. Do not reply.</p>
            </div>
        </div>
    </body>
    </html>`;

    await getTransporter().sendMail({
        from: `"Attentio System" <${process.env.MAIL_USER}>`,
        to: 'sasikrubalani@gmail.com',
        subject: `📊 [Attentio] ${studentName} — Attention Report (${timeStr})`,
        html
    });
}

/**
 * Send a final session summary when the student leaves.
 */
async function sendSummaryReport({ facultyEmail, facultyName, studentName, meetingTitle, sessionStart, allStats }) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const sessionStartDate = new Date(sessionStart);
    const durationMs = now - sessionStartDate;
    const durationMin = Math.floor(durationMs / 60000);
    const durationStr = durationMin < 1 ? 'Less than a minute' : `${durationMin} min`;

    // Compute averages across all snapshots
    const validStats = allStats.filter(s => s && typeof s.attention === 'number');
    const avgAttention = validStats.length
        ? Math.round(validStats.reduce((sum, s) => sum + s.attention, 0) / validStats.length)
        : 0;
    const avgPosture = validStats.length
        ? (validStats.reduce((sum, s) => sum + (parseFloat(s.posture) || 0), 0) / validStats.length).toFixed(2)
        : 'N/A';

    // Aggregate emotion distribution
    const emotionTotals = {};
    validStats.forEach(s => {
        if (s.emotion_distribution) {
            Object.entries(s.emotion_distribution).forEach(([k, v]) => {
                emotionTotals[k] = (emotionTotals[k] || 0) + v;
            });
        }
    });
    const emotionRows = Object.entries(emotionTotals).length
        ? Object.entries(emotionTotals)
            .sort((a, b) => b[1] - a[1])
            .map(([emotion, total]) => {
                const avg = Math.round(total / validStats.length);
                return `
                <tr>
                    <td style="padding:6px 12px;text-transform:capitalize;color:#94a3b8;">${emotion}</td>
                    <td style="padding:6px 12px;">
                        <div style="background:#1e293b;border-radius:4px;overflow:hidden;width:120px;display:inline-block;vertical-align:middle;">
                            <div style="background:#8b5cf6;width:${avg}%;height:8px;"></div>
                        </div>
                        <span style="margin-left:8px;color:#e2e8f0;font-size:12px;">${avg}%</span>
                    </td>
                </tr>`;
            }).join('')
        : '<tr><td colspan="2" style="color:#64748b;padding:8px 12px;">N/A</td></tr>';

    const attentionColor = avgAttention > 75 ? '#22c55e' : avgAttention > 45 ? '#f59e0b' : '#ef4444';
    const attentionLabel = avgAttention > 75 ? '✅ High' : avgAttention > 45 ? '⚠️ Moderate' : '❌ Low';

    // Timeline snapshot table (last 5 readings)
    const snapshotRows = validStats.slice(-5).map((s, i) => `
        <tr style="border-bottom:1px solid #1e293b;">
            <td style="padding:8px 12px;color:#64748b;font-size:12px;">Snapshot ${validStats.length - (Math.min(5, validStats.length) - 1 - i)}</td>
            <td style="padding:8px 12px;font-size:12px;color:${s.attention > 75 ? '#22c55e' : s.attention > 45 ? '#f59e0b' : '#ef4444'};font-weight:600;">${s.attention}%</td>
            <td style="padding:8px 12px;font-size:12px;color:#38bdf8;">${s.posture ?? 'N/A'}</td>
        </tr>`).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="max-width:640px;margin:32px auto;background:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.5);">
            <!-- Header -->
            <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5,#0ea5e9);padding:32px;">
                <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;">📋 Session Summary Report</h1>
                <p style="margin:8px 0 0;color:#c7d2fe;font-size:13px;">Student left the meeting — Final Report</p>
            </div>

            <!-- Session Info -->
            <div style="padding:28px 32px 0;">
                <h3 style="margin:0 0 16px;color:#e2e8f0;font-size:15px;font-weight:700;border-bottom:1px solid #334155;padding-bottom:10px;">Session Information</h3>
                <table style="width:100%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;width:150px;">Student</td>
                        <td style="color:#f1f5f9;font-weight:600;font-size:13px;">${studentName}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Session</td>
                        <td style="color:#f1f5f9;font-size:13px;">${meetingTitle}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Date</td>
                        <td style="color:#f1f5f9;font-size:13px;">${dateStr}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Joined At</td>
                        <td style="color:#f1f5f9;font-size:13px;">${sessionStartDate.toLocaleTimeString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Left At</td>
                        <td style="color:#f1f5f9;font-size:13px;">${now.toLocaleTimeString('en-IN')}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Duration</td>
                        <td style="color:#f1f5f9;font-size:13px;">${durationStr}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0;color:#94a3b8;font-size:13px;">Snapshots Taken</td>
                        <td style="color:#f1f5f9;font-size:13px;">${validStats.length}</td>
                    </tr>
                </table>
            </div>

            <!-- Average Attention -->
            <div style="margin:24px 32px;background:#0f172a;border-radius:12px;padding:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                    <span style="color:#94a3b8;font-size:13px;font-weight:600;">AVERAGE ATTENTION SCORE</span>
                    <span style="color:${attentionColor};font-size:28px;font-weight:800;">${avgAttention}%</span>
                </div>
                <div style="background:#1e293b;border-radius:8px;overflow:hidden;height:12px;">
                    <div style="background:${attentionColor};width:${avgAttention}%;height:100%;border-radius:8px;"></div>
                </div>
                <div style="margin-top:8px;color:${attentionColor};font-size:13px;font-weight:600;text-align:right;">${attentionLabel}</div>
            </div>

            <!-- Avg Posture -->
            <div style="margin:0 32px 24px;">
                <div style="background:#0f172a;border-radius:12px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <span style="color:#94a3b8;font-size:13px;font-weight:600;">AVERAGE POSTURE SCORE</span>
                    <span style="color:#38bdf8;font-size:20px;font-weight:700;">${avgPosture}</span>
                </div>
            </div>

            <!-- Emotion Summary -->
            <div style="margin:0 32px 24px;">
                <div style="background:#0f172a;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;font-weight:600;">AVERAGE EMOTION DISTRIBUTION</p>
                    <table style="width:100%;border-collapse:collapse;">
                        ${emotionRows}
                    </table>
                </div>
            </div>

            <!-- Recent Snapshots -->
            ${validStats.length > 0 ? `
            <div style="margin:0 32px 32px;">
                <div style="background:#0f172a;border-radius:12px;padding:16px 20px;">
                    <p style="margin:0 0 12px;color:#94a3b8;font-size:13px;font-weight:600;">RECENT SNAPSHOTS (Last 5)</p>
                    <table style="width:100%;border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:1px solid #334155;">
                                <th style="text-align:left;padding:8px 12px;color:#64748b;font-size:11px;font-weight:600;">SNAPSHOT</th>
                                <th style="text-align:left;padding:8px 12px;color:#64748b;font-size:11px;font-weight:600;">ATTENTION</th>
                                <th style="text-align:left;padding:8px 12px;color:#64748b;font-size:11px;font-weight:600;">POSTURE</th>
                            </tr>
                        </thead>
                        <tbody>${snapshotRows}</tbody>
                    </table>
                </div>
            </div>` : ''}

            <!-- Footer -->
            <div style="background:#0f172a;padding:18px 32px;text-align:center;">
                <p style="margin:0;color:#475569;font-size:12px;">Generated automatically by <strong style="color:#6366f1;">Attentio</strong> · Do not reply to this email.</p>
            </div>
        </div>
    </body>
    </html>`;

    await getTransporter().sendMail({
        from: `"Attentio System" <${process.env.MAIL_USER}>`,
        to: 'sasikrubalani@gmail.com',
        subject: `📋 [Attentio] Session Summary — ${studentName} (${meetingTitle})`,
        html
    });
}

module.exports = { sendPeriodicReport, sendSummaryReport };

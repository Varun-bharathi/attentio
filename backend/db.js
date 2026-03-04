const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_NAME || 'attentio_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false
    }
);

const User = sequelize.define('users', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.ENUM('student', 'faculty'), allowNull: false },
    class_id: { type: DataTypes.STRING, defaultValue: null }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

const Meeting = sequelize.define('meetings', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    meeting_link: { type: DataTypes.STRING, unique: true, allowNull: false },
    faculty_id: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'ended'), defaultValue: 'active' }
}, {
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

const MeetingParticipant = sequelize.define('meeting_participants', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    meeting_id: { type: DataTypes.INTEGER, allowNull: false },
    student_id: { type: DataTypes.INTEGER, allowNull: false },
    joined_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW },
    left_at: { type: DataTypes.DATE, allowNull: true }
}, { timestamps: false });

const AttentionReport = sequelize.define('attention_reports', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    meeting_id: { type: DataTypes.INTEGER, allowNull: false },
    student_id: { type: DataTypes.INTEGER, allowNull: false },
    attention_score: { type: DataTypes.FLOAT, allowNull: false },
    emotion_distribution: { type: DataTypes.JSON, allowNull: false },
    posture_score: { type: DataTypes.FLOAT, allowNull: false },
    recorded_at: { type: DataTypes.DATE, defaultValue: Sequelize.NOW }
}, { timestamps: false });

module.exports = { sequelize, User, Meeting, MeetingParticipant, AttentionReport };

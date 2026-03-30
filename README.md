# Attentio - AI Smart Classroom Monitoring System

## 📖 Project Overview
Attentio is an advanced full-stack application designed to monitor and analyze student attention in real-time during online classes. The platform leverages artificial intelligence, computer vision, and real-time communication to provide educators with actionable insights into student engagement without compromising privacy.

The system uses a React-based frontend for a seamless user experience, a Node.js and Express backend for robust API handling, and Socket.IO for real-time signaling. The core AI module processes video frames using OpenCV and MediaFFPipe (via a spawned Python process) to detect attention levels based on specific behavioral cues like posture and emotion.

---

## 💻 Tech Stack
The project is built using a modern and scalable technology stack:
- **Frontend**: React (Vite), Tailwind CSS, Socket.IO Client, Axios, React Router DOM
- **Backend**: Node.js, Express, Sequelize (ORM), Socket.IO
- **Database**: SQLite (Self-contained, serverless database)
- **AI Module**: Python 3.10+, OpenCV, MediaPipe, TensorFlow, Protobuf

---

## ⚙️ Prerequisites
Before setting up the project locally, ensure you have the following installed on your system:
- **Node.js**: v18.0 or higher
- **Python**: v3.10 or higher
- **Git**

---

## 🔧 Environment Setup (.env)
You need to create a `.env` file in the `backend` directory with the following configuration:

```env
# Security
SECRET_KEY=super-secret-key-12345
PORT=8000

# Email Delivery (for automated email reports)
SMTP_USER=your-email@gmail.com
SMTP_PASS="your-16-character-app-password"
SMTP_TO=recipient@gmail.com
```
*(Note: Database connection strings like DB_HOST, DB_USER, etc., are no longer needed because the project uses SQLite, which automatically creates a local `database.sqlite` file).*

You also need to create a `.env` file in the `frontend` directory with the following configuration:

```env
VITE_API_URL="http://localhost:8000/api"
VITE_BASE_PATH="/"
```

---

## 🚀 Installation & Running

### 1. Backend & AI Module
The backend runs on Node.js and spawns the Python AI service in the background automatically.

Open a new terminal in the project root and execute the following commands:
```bash
# Navigate to the backend directory
cd backend

# Install the required Node.js dependencies
npm install

# Install the required Python dependencies for the AI Module
pip install opencv-python "numpy<2.0.0" pandas mediapipe==0.10.32 deepface "protobuf<4" tensorflow

# Start the Node.js backend (with nodemon for auto-restarts)
npm run dev
```
*The backend server will run on `http://localhost:8000` and automatically create the SQLite database file if it doesn't exist.*

### 2. Frontend Application
Open another terminal instance for the frontend development server:

```bash
# Navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the React development server
npm run dev
```
*The frontend application will run on `http://localhost:5173`.*

---

## ✨ Features Delivered
- **Role Selection & Authentication**: Secure, JWT-protected user accounts, supporting distinct roles for Faculty and Students.
- **Faculty Dashboard**: Allows educators to create and manage real-time, WebRTC-enabled online classes or meeting links effortlessly.
- **Student Dashboard**: Provides students with a secure gateway to join classes and stream live video for engagement analysis.
- **AI Attention Engine**: Real-time distraction detection utilizing bounding volume techniques via MediaPipe. Student video frames are sampled locally, securely transmitted via WebSockets to the Node backend, passed to the Python module, processed instantly in memory, and immediately discarded—ensuring strict privacy compliance.
- **Scalability**: Employs a decoupled Socket.IO handler alongside RESTful routes, allowing connection pooling and clean, scalable real-time events.
- **Privacy Controls**: Students will not see their own or others' attention metrics. Faculty hosts exclusively receive aggregated live statistics, keeping monitoring both effective and private.
- **Automated Student Reporting**: The system is designed so that the student's interface actively tracks their engagement metrics and automatically emails individual, real-time mid-session reports *from the student directly to the faculty's registered email address*.
- **End-of-Class Summaries**: Faculty hosts automatically receive comprehensive plain-text engagement summaries directly to their inbox as soon as they conclude a session. All email infrastructure is managed natively, entirely eliminating any reliance on external webhooks or Google Apps Scripts.
- **Self-Contained Database**: Switched to SQLite, removing the need to manage external SQL servers or local database setups.

---
*Developed to empower digital education with intelligent monitoring.*
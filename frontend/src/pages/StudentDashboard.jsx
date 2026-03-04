import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const StudentDashboard = () => {
    const [meetingLink, setMeetingLink] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    if (!user || user.role !== 'student') {
        return <div className="text-white">Unauthorized. Please login as a student.</div>;
    }

    const joinMeeting = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                'http://localhost:8000/api/meeting/join',
                { meeting_link: meetingLink },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.meeting_id) {
                navigate(`/meeting/${meetingLink}`);
            }
        } catch (err) {
            setError('Failed to join meeting. Please check the link.');
        }
    };

    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <nav className="flex justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg mb-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Attentio Student</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-300">Welcome, {user.name}</span>
                    <button onClick={logout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors">Logout</button>
                </div>
            </nav>

            <div className="max-w-2xl mx-auto space-y-8">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl text-center">
                    <h2 className="text-3xl font-extrabold mb-4">Join a Class</h2>
                    <p className="text-gray-400 mb-8">Enter the meeting link provided by your faculty to join the session.</p>

                    {error && <p className="text-red-500 mb-4">{error}</p>}

                    <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                        <input
                            type="text"
                            placeholder="e.g. 123e4567-e89b-12d3... "
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                            className="flex-1 bg-gray-700 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                        />
                        <button
                            onClick={joinMeeting}
                            className="bg-blue-600 hover:bg-blue-700 px-8 py-4 rounded-xl font-bold text-lg transition-colors"
                        >
                            Join Room
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;

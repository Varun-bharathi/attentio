import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const FacultyDashboard = () => {
    const [meetings, setMeetings] = useState([]);
    const [title, setTitle] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user || user.role !== 'faculty') {
            navigate('/');
            return;
        }
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('http://localhost:8000/api/meeting/active', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMeetings(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const createMeeting = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`http://localhost:8000/api/meeting/create?title=${title}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMeetings([...meetings, res.data]);
            setTitle('');
        } catch (err) {
            setError('Failed to create meeting.');
        }
    };

    const logout = () => {
        localStorage.clear();
        navigate('/');
    };

    const downloadRoadmap = async (category) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`http://localhost:8000/api/analytics/roadmap?category=${category}`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob' // Important for PDF downloads
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('link');
            link.href = url;
            link.setAttribute('download', `cs_roadmap_${category.toLowerCase()}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Failed to download roadmap. Please restart your python run.py backend server to load the new changes.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <nav className="flex justify-between items-center bg-gray-800 p-4 rounded-xl shadow-lg mb-8">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Attentio Faculty</h1>
                <div className="flex items-center space-x-4">
                    <span className="text-gray-300">Welcome, {user?.name}</span>
                    <button onClick={logout} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-semibold transition-colors">Logout</button>
                </div>
            </nav>

            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl">
                    <h2 className="text-2xl font-extrabold mb-6">Create New Meeting</h2>
                    {error && <p className="text-red-500 mb-4">{error}</p>}
                    <form onSubmit={createMeeting} className="space-y-4">
                        <input
                            type="text"
                            placeholder="Class Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-gray-700 text-white p-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                        <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition-colors">
                            Create Room
                        </button>
                    </form>
                </div>

                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl overflow-y-auto max-h-96">
                    <h2 className="text-2xl font-extrabold mb-6">Your Active Meetings</h2>
                    {meetings.length === 0 ? (
                        <p className="text-gray-400 text-center py-8">No active meetings. Create one to start.</p>
                    ) : (
                        <div className="space-y-4">
                            {meetings.map((m) => (
                                <div key={m.id} className="bg-gray-700 p-4 rounded-xl shadow border border-gray-600 flex flex-col justify-between">
                                    <div className="mb-4">
                                        <h3 className="font-bold text-lg text-indigo-300">{m.title}</h3>
                                        <p className="text-sm text-gray-400 font-mono mt-1 break-all">Link: {m.meeting_link}</p>
                                    </div>
                                    <div className="flex justify-between items-center space-x-2">
                                        <Link to={`/meeting/${m.meeting_link}`} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-sm transition-colors text-center flex-1">
                                            Join Room
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* AI Roadmap Generator Section */}
            <div className="max-w-7xl mx-auto mt-8 bg-gray-800 p-8 rounded-2xl shadow-xl">
                <h2 className="text-xl font-extrabold mb-2 text-indigo-400">Generate Tech Roadmaps</h2>
                <p className="text-sm text-gray-400 mb-6">Download tailored study pathways specifically designed for different career tracks and technologies.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <button
                        onClick={() => downloadRoadmap('Fullstack_JS')}
                        className="bg-yellow-600/20 border border-yellow-500 hover:bg-yellow-600 hover:text-white text-yellow-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        Fullstack (JS)
                    </button>
                    <button
                        onClick={() => downloadRoadmap('Fullstack_Python')}
                        className="bg-blue-600/20 border border-blue-500 hover:bg-blue-600 hover:text-white text-blue-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        Fullstack (Python)
                    </button>
                    <button
                        onClick={() => downloadRoadmap('Fullstack_Java')}
                        className="bg-red-600/20 border border-red-500 hover:bg-red-600 hover:text-white text-red-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        Fullstack (Java)
                    </button>
                    <button
                        onClick={() => downloadRoadmap('AIML')}
                        className="bg-purple-600/20 border border-purple-500 hover:bg-purple-600 hover:text-white text-purple-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        AI & ML
                    </button>
                    <button
                        onClick={() => downloadRoadmap('AIDS')}
                        className="bg-indigo-600/20 border border-indigo-500 hover:bg-indigo-600 hover:text-white text-indigo-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        AI & Data Science
                    </button>
                    <button
                        onClick={() => downloadRoadmap('SAP')}
                        className="bg-cyan-600/20 border border-cyan-500 hover:bg-cyan-600 hover:text-white text-cyan-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        SAP Development
                    </button>
                    <button
                        onClick={() => downloadRoadmap('AWS')}
                        className="bg-orange-600/20 border border-orange-500 hover:bg-orange-600 hover:text-white text-orange-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        AWS Cloud
                    </button>
                    <button
                        onClick={() => downloadRoadmap('UIUX')}
                        className="bg-pink-600/20 border border-pink-500 hover:bg-pink-600 hover:text-white text-pink-400 font-bold py-3 px-3 text-sm rounded-xl transition-all"
                    >
                        UI/UX Design
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;

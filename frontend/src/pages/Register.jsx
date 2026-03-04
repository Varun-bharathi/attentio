import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const role = localStorage.getItem('role_intent') || 'student';

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8000/api/auth/register', { name, email, password, role });
            setSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
            <div className="bg-gray-800 p-8 rounded-lg w-full max-w-md shadow-2xl">
                <h2 className="text-3xl font-bold text-center text-white mb-6">Register as {role}</h2>
                {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
                {success && <p className="text-green-500 mb-4 text-center">{success}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-400 mb-2">Full Name</label>
                        <input
                            type="text"
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2">Email</label>
                        <input
                            type="email"
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 mb-2">Password</label>
                        <input
                            type="password"
                            className="w-full bg-gray-700 text-white p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg font-bold transition-colors">
                        Sign Up
                    </button>
                </form>
                <p className="mt-6 text-center text-gray-400">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:underline">Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;

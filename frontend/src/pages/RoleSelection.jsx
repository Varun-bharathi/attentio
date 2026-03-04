import React from 'react';
import { useNavigate } from 'react-router-dom';

const RoleSelection = () => {
    const navigate = useNavigate();

    const handleRoleSelect = (role) => {
        localStorage.setItem('role_intent', role);
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6">
            <div className="max-w-md w-full text-center">
                <h1 className="text-4xl font-extrabold mb-8 bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">Attentio</h1>
                <p className="text-gray-400 mb-12 text-lg">Smart Classroom Attention Monitoring System</p>

                <div className="space-y-6">
                    <button
                        onClick={() => handleRoleSelect('student')}
                        className="w-full relative group bg-gray-800 border-2 border-transparent hover:border-blue-500 rounded-xl p-6 transition-all duration-300"
                    >
                        <h2 className="text-2xl font-bold mb-2 group-hover:text-blue-400">Student</h2>
                        <p className="text-sm text-gray-400">Join classes and track your learning</p>
                    </button>

                    <button
                        onClick={() => handleRoleSelect('faculty')}
                        className="w-full relative group bg-gray-800 border-2 border-transparent hover:border-indigo-500 rounded-xl p-6 transition-all duration-300"
                    >
                        <h2 className="text-2xl font-bold mb-2 group-hover:text-indigo-400">Faculty</h2>
                        <p className="text-sm text-gray-400">Host meetings and monitor engagement</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;

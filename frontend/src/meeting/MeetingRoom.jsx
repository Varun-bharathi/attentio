import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

// Video component to handle remote streams
const RemoteVideo = ({ stream, name, userStats }) => {
    const ref = useRef();
    useEffect(() => {
        if (ref.current && stream) {
            ref.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className="relative bg-gray-900 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-gray-800">
            <video ref={ref} autoPlay playsInline className="w-full h-full object-contain bg-black" />
            <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-sm text-white font-semibold">
                {name}
                {userStats && ` - Attention: ${userStats.attention}%`}
            </div>
        </div>
    );
};

const MeetingRoom = () => {
    const { meetingId } = useParams();
    const navigate = useNavigate();

    // UI states
    const [hasConsented, setHasConsented] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const [joinRequests, setJoinRequests] = useState([]);
    const [micEnabled, setMicEnabled] = useState(true);
    const [cameraEnabled, setCameraEnabled] = useState(true);
    const [inMeeting, setInMeeting] = useState(false);

    // Data states
    const [participants, setParticipants] = useState({});
    const [remoteStreams, setRemoteStreams] = useState({});
    const [stats, setStats] = useState({});

    // Refs
    const localVideoRef = useRef(null);
    const socketRef = useRef(null);
    const streamRef = useRef(null);
    const peersRef = useRef({});

    const user = JSON.parse(localStorage.getItem('user'));
    const isFaculty = user?.role === 'faculty';

    useEffect(() => {
        if (!user) navigate('/');
    }, [user, navigate]);

    // ICE Servers for RTCPeerConnection
    const rtcConfig = {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };

    const createPeer = (targetSid, callerId) => {
        const peer = new RTCPeerConnection(rtcConfig);

        // Add local tracks
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                peer.addTrack(track, streamRef.current);
            });
        }

        peer.onicecandidate = (e) => {
            if (e.candidate && socketRef.current) {
                socketRef.current.emit('ice_candidate', { target: targetSid, candidate: e.candidate });
            }
        };

        peer.ontrack = (e) => {
            setRemoteStreams(prev => ({
                ...prev,
                [targetSid]: e.streams[0]
            }));
        };

        peersRef.current[targetSid] = peer;
        return peer;
    };

    const setupMeeting = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            socketRef.current = io('http://localhost:8000', { transports: ['websocket'] });

            // Setup Socket Listeners
            socketRef.current.on('connect', () => {
                if (isFaculty) {
                    // Faculty directly joins
                    socketRef.current.emit('join_meeting', { meeting_link: meetingId, user });
                    setInMeeting(true);
                } else {
                    // Student hits the waiting room
                    setIsWaiting(true);
                    socketRef.current.emit('join_request', { meeting_link: meetingId, user });
                }
            });

            // Admittance logic
            socketRef.current.on('student_join_request', (data) => {
                if (isFaculty) setJoinRequests(prev => [...prev, data]);
            });

            socketRef.current.on('join_accepted', (data) => {
                setIsWaiting(false);
                setInMeeting(true);
                socketRef.current.emit('join_meeting', { meeting_link: data.meeting_link, user });
                startFrameCapture();
            });

            socketRef.current.on('join_denied', () => {
                alert("The host denied your entry.");
                handleLeave();
            });

            // WebRTC Signaling
            socketRef.current.on('student_joined', async ({ sid, user: joinedUser }) => {
                setParticipants(prev => ({ ...prev, [sid]: joinedUser }));

                // Existing members initiate offer to the newcomer
                const peer = createPeer(sid, socketRef.current.id);
                const offer = await peer.createOffer();
                await peer.setLocalDescription(offer);
                socketRef.current.emit('offer', { target: sid, sdp: peer.localDescription });
            });

            socketRef.current.on('offer', async ({ sdp, caller }) => {
                // Newcomer receives offer, creates peer, sends answer
                const peer = createPeer(caller, socketRef.current.id);
                await peer.setRemoteDescription(new RTCSessionDescription(sdp));
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socketRef.current.emit('answer', { target: caller, sdp: peer.localDescription });
            });

            socketRef.current.on('answer', async ({ sdp, callee }) => {
                // Initiator receives answer
                const peer = peersRef.current[callee];
                if (peer) await peer.setRemoteDescription(new RTCSessionDescription(sdp));
            });

            socketRef.current.on('ice_candidate', async ({ candidate, sender }) => {
                const peer = peersRef.current[sender];
                if (peer) await peer.addIceCandidate(new RTCIceCandidate(candidate));
            });

            socketRef.current.on('student_left', ({ sid }) => {
                if (peersRef.current[sid]) {
                    peersRef.current[sid].close();
                    delete peersRef.current[sid];
                }
                setRemoteStreams(prev => {
                    const ns = { ...prev };
                    delete ns[sid];
                    return ns;
                });
                setParticipants(prev => {
                    const ns = { ...prev };
                    delete ns[sid];
                    return ns;
                });
                setStats(prev => {
                    const ns = { ...prev };
                    delete ns[sid];
                    return ns;
                });
            });

            socketRef.current.on('attention_update', (data) => {
                if (isFaculty) {
                    setStats(prev => ({ ...prev, [data.sid]: { ...data.user, ...data.stats } }));
                }
            });

        } catch (err) {
            console.error("Failed to access media devices", err);
            alert("Please allow camera and microphone access to join.");
        }
    };

    const startFrameCapture = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');

        setInterval(() => {
            if (localVideoRef.current && localVideoRef.current.readyState >= 2 && cameraEnabled) {
                ctx.drawImage(localVideoRef.current, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                if (socketRef.current?.connected) {
                    socketRef.current.emit('send_frame', { frame: dataUrl });
                }
            }
        }, 3000);
    };

    const toggleMic = () => {
        if (streamRef.current) {
            const track = streamRef.current.getAudioTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setMicEnabled(track.enabled);
            }
        }
    };

    const toggleCamera = () => {
        if (streamRef.current) {
            const track = streamRef.current.getVideoTracks()[0];
            if (track) {
                track.enabled = !track.enabled;
                setCameraEnabled(track.enabled);
            }
        }
    };

    const acceptStudent = (sid) => {
        socketRef.current.emit('admit_student', { sid, meeting_link: meetingId });
        setJoinRequests(prev => prev.filter(req => req.sid !== sid));
    };

    const denyStudent = (sid) => {
        socketRef.current.emit('deny_student', { sid });
        setJoinRequests(prev => prev.filter(req => req.sid !== sid));
    };

    const handleLeave = () => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        if (socketRef.current) socketRef.current.disconnect();
        Object.values(peersRef.current).forEach(peer => peer.close());
        navigate(isFaculty ? '/faculty-dashboard' : '/student-dashboard');
    };

    useEffect(() => {
        if (isFaculty) {
            setHasConsented(true);
            setupMeeting();
        }
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
            if (socketRef.current) socketRef.current.disconnect();
            Object.values(peersRef.current).forEach(peer => peer.close());
        };
    }, [isFaculty]);

    // Student UI flow logic
    if (!isFaculty && !hasConsented) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-lg text-center text-white">
                    <h2 className="text-2xl font-bold mb-4">Privacy & Consent</h2>
                    <p className="text-gray-300 mb-8">
                        This system analyzes attentiveness using real-time camera monitoring. Do you consent to facial and posture analysis during the classroom for educational purposes? Images are NEVER permanently stored.
                    </p>
                    <div className="flex space-x-4 justify-center">
                        <button onClick={() => { setHasConsented(true); setupMeeting(); }} className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold transition">Agree & Join</button>
                        <button onClick={() => navigate('/student-dashboard')} className="bg-gray-600 hover:bg-gray-700 px-6 py-3 rounded-lg font-bold transition">Cancel</button>
                    </div>
                </div>
            </div>
        );
    }

    if (isWaiting) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md text-center text-white">
                    <h2 className="text-2xl font-bold mb-4 animate-pulse">Waiting Room</h2>
                    <p className="text-gray-300 mb-6">Please wait while the faculty lets you in...</p>
                    <button onClick={handleLeave} className="text-red-400 hover:text-red-300 font-bold">Leave</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <header className="bg-gray-900 p-4 shadow-md flex justify-between items-center z-10">
                <div className="flex items-center space-x-6">
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                        Class: {meetingId.substring(0, 8)}...
                    </h1>

                    {/* AV Toggles */}
                    <div className="flex space-x-3 border-l border-gray-700 pl-6">
                        <button onClick={toggleMic} className={`p-2 rounded-full flex items-center justify-center transition-all ${micEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                            {micEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                        </button>
                        <button onClick={toggleCamera} className={`p-2 rounded-full flex items-center justify-center transition-all ${cameraEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>
                            {cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                        </button>
                    </div>
                </div>
                <button onClick={handleLeave} className="bg-red-600 hover:bg-red-700 px-5 py-2 rounded-lg font-bold text-sm shadow">Leave Meeting</button>
            </header>

            {isFaculty && joinRequests.length > 0 && (
                <div className="bg-indigo-900 text-white px-4 py-3 flex justify-between items-center animate-fade-in-down shadow">
                    <div><span className="font-bold">{joinRequests[0].user.name}</span> wants to join the meeting.</div>
                    <div className="flex space-x-2">
                        <button onClick={() => acceptStudent(joinRequests[0].sid)} className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded font-bold">Admit</button>
                        <button onClick={() => denyStudent(joinRequests[0].sid)} className="bg-transparent border border-white hover:bg-white/10 px-4 py-1 rounded font-bold">Deny</button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex p-4 gap-4 overflow-hidden relative">

                {/* Main Video Grid */}
                <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr h-full overflow-y-auto pr-2">

                    {/* Local Feed */}
                    <div className="relative bg-gray-900 rounded-xl flex items-center justify-center shadow-inner overflow-hidden border border-gray-800 min-h-[250px] max-h-full">
                        <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-contain ${cameraEnabled ? '' : 'hidden'}`} />
                        {!cameraEnabled && <div className="text-gray-500 font-semibold absolute">Camera Off</div>}
                        <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded text-sm text-white font-bold tracking-wide">
                            You ({user.name})
                        </div>
                    </div>

                    {/* Remote Feeds */}
                    {Object.entries(remoteStreams).map(([sid, stream]) => (
                        <RemoteVideo
                            key={sid}
                            stream={stream}
                            name={participants[sid]?.name || "Student"}
                            userStats={isFaculty ? stats[sid] : null}
                        />
                    ))}

                    {Object.keys(remoteStreams).length === 0 && !isFaculty && (
                        <div className="relative bg-gray-900 rounded-xl flex items-center justify-center border border-gray-800 border-dashed text-gray-500">
                            Waiting for others to join...
                        </div>
                    )}
                </div>

                {/* Faculty Live Analytics Sidebar */}
                {isFaculty && (
                    <div className="w-80 min-w-[320px] bg-gray-900 rounded-xl p-5 shadow-inner border border-gray-800 flex flex-col h-full overflow-y-auto shrink-0 transition-all">
                        <h2 className="text-xl font-bold mb-4 pb-3 border-b border-gray-700 text-indigo-400">Live Analytics</h2>
                        {Object.keys(stats).length === 0 ? (
                            <div className="h-full flex items-center justify-center text-slate-500 text-center text-sm px-4 leading-relaxed">
                                Students will appear here once they grant camera permissions and join the room.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {Object.values(stats).map((val, idx) => (
                                    <div key={idx} className="bg-gray-800/80 p-4 rounded-xl flex flex-col border border-gray-700 shadow-md">
                                        <div className="font-extrabold text-md mb-2">{val.name}</div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs text-gray-400 font-medium">Attention Score</span>
                                            <span className={`text-sm font-black ${val.attention > 75 ? 'text-green-400' : val.attention > 45 ? 'text-amber-400' : 'text-red-500'}`}>
                                                {val.attention}%
                                            </span>
                                        </div>
                                        {/* Simple Progress Bar */}
                                        <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
                                            <div className={`h-1.5 rounded-full ${val.attention > 75 ? 'bg-green-400' : val.attention > 45 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${val.attention}%` }}></div>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-400 font-medium">Posture/Gaze</span>
                                            <span className="text-xs text-slate-300 font-bold capitalize">{val.posture || val.emotion || "Loading.."}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MeetingRoom;

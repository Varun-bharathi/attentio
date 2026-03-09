import cv2
import mediapipe as mp

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)

def analyze_posture(frame_arr):
    """
    Analyzes the posture using MediaPipe.
    Return values could be: 'good', 'slouching', 'looking away'
    """
    try:
        results = pose.process(frame_arr)
        if not results.pose_landmarks:
            return "not detected"
        
        # Simple heuristic: compare nose with shoulders to detect looking away
        landmarks = results.pose_landmarks.landmark
        nose = landmarks[mp_pose.PoseLandmark.NOSE.value]
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        
        # Detect looking away heuristically if nose is outside the shoulders x range
        if nose.x < right_shoulder.x or nose.x > left_shoulder.x:
            return "looking away"
        
        # More advanced calculations can determine slouching
        return "attentive"
    except Exception as e:
        return "error"

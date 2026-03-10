import cv2
import mediapipe as mp

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)

def analyze_posture(frame_arr):
    """
    Analyzes the posture and gesture using MediaPipe Pose.
    Return values could be: 'attentive, hand raised', 'looking away, touching face', etc.
    """
    try:
        results = pose.process(frame_arr)
        if not results.pose_landmarks:
            return "not detected, no gesture"
        
        landmarks = results.pose_landmarks.landmark
        nose = landmarks[mp_pose.PoseLandmark.NOSE.value]
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        left_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
        right_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
        
        # Posture heuristic: Detect looking away if nose is outside the shoulders x range
        posture = "attentive"
        if nose.x < right_shoulder.x or nose.x > left_shoulder.x:
            posture = "looking away"
            
        # Gesture heuristics:
        # Hand raised (wrist above shoulder)
        # Touching face (wrist near nose)
        gesture = "no gesture"
        
        # In MediaPipe, y decreases upwards.
        if left_wrist.y < left_shoulder.y or right_wrist.y < right_shoulder.y:
            gesture = "hand raised"
            
        # Distance from wrist to nose
        dist_left = ((left_wrist.x - nose.x)**2 + (left_wrist.y - nose.y)**2)**0.5
        dist_right = ((right_wrist.x - nose.x)**2 + (right_wrist.y - nose.y)**2)**0.5
        
        if dist_left < 0.1 or dist_right < 0.1:
            gesture = "touching face"
            
        return f"{posture}, {gesture}"
    except Exception as e:
        return "error, error"

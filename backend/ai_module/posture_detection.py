import cv2
import mediapipe as mp

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(static_image_mode=False, min_detection_confidence=0.5, min_tracking_confidence=0.5)

def analyze_posture(frame_arr):
    """
    Analyzes the posture and gesture using MediaPipe Pose.
    Return values could be: 'attentive, hand raised', 'looking away, touching face', 'looking down, no gesture'
    """
    try:
        results = pose.process(frame_arr)
        if not results.pose_landmarks:
            return "not detected, no gesture"
        
        landmarks = results.pose_landmarks.landmark
        
        nose = landmarks[mp_pose.PoseLandmark.NOSE.value]
        left_ear = landmarks[mp_pose.PoseLandmark.LEFT_EAR.value]
        right_ear = landmarks[mp_pose.PoseLandmark.RIGHT_EAR.value]
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        left_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST.value]
        right_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST.value]
        
        posture = "attentive"
        
        # Posture: Head turning (looking away side-to-side)
        # Compare distance from nose to left ear vs right ear
        ear_dist_l = abs(nose.x - left_ear.x)
        ear_dist_r = abs(nose.x - right_ear.x)
        
        # If one ear is significantly closer to the nose than the other (head turned left/right)
        if ear_dist_l < ear_dist_r * 0.3 or ear_dist_r < ear_dist_l * 0.3:
            posture = "looking away"
            
        # Posture: Head tilt (looking down)
        # In MediaPipe, Y is 0 at top, 1 at bottom. Nose drops relative to ears when looking down
        avg_ear_y = (left_ear.y + right_ear.y) / 2.0
        if nose.y > avg_ear_y + 0.12:
            posture = "looking down"
            
        # Gestures
        gesture = "no gesture"
        
        # Hand raised (wrist above shoulder)
        if left_wrist.y < left_shoulder.y - 0.1 or right_wrist.y < right_shoulder.y - 0.1:
            gesture = "hand raised"
            
        # Touching face (wrist near nose)
        dist_left_face = ((left_wrist.x - nose.x)**2 + (left_wrist.y - nose.y)**2)**0.5
        dist_right_face = ((right_wrist.x - nose.x)**2 + (right_wrist.y - nose.y)**2)**0.5
        
        if dist_left_face < 0.15 or dist_right_face < 0.15:
            gesture = "touching face"
            
        return f"{posture}, {gesture}"
    except Exception as e:
        return "error, error"

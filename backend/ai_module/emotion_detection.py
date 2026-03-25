import cv2
import mediapipe as mp
import os
import contextlib
with contextlib.redirect_stdout(open(os.devnull, 'w')):
    from deepface import DeepFace

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

def analyze_emotion(frame_arr):
    """
    Analyzes emotions using DeepFace and eyeball movements (gaze) using MediaPipe FaceMesh.
    Returns: string combining expression and gaze state
    """
    try:
        # 1. EMOTION DETECTION with DeepFace
        emotion = "neutral"
        try:
            df_results = DeepFace.analyze(frame_arr, actions=['emotion'], enforce_detection=False, silent=True)
            if isinstance(df_results, list):
                df_results = df_results[0]
            emotion = df_results.get('dominant_emotion', 'neutral')
        except Exception:
            pass # Fallback to neutral if DeepFace fails
            
        # 2. GAZE DETECTION & MOUTH with MediaPipe FaceMesh
        results = face_mesh.process(frame_arr)
        gaze = "not detected"
        
        if results.multi_face_landmarks:
            landmarks = results.multi_face_landmarks[0].landmark
            
            # Left eye components
            left_iris = landmarks[468]
            left_eye_outer = landmarks[33]
            left_eye_inner = landmarks[133]
            
            # Right eye components
            right_iris = landmarks[473]
            right_eye_outer = landmarks[263]
            right_eye_inner = landmarks[362]
            
            # Compute iris ratio for both eyes to handle varied angles
            left_ratio = (left_iris.x - left_eye_outer.x) / (left_eye_inner.x - left_eye_outer.x + 0.0001)
            right_ratio = (right_iris.x - right_eye_inner.x) / (right_eye_outer.x - right_eye_inner.x + 0.0001)
            avg_ratio = (left_ratio + right_ratio) / 2.0
            
            gaze = "center gaze"
            if avg_ratio > 0.65:
                gaze = "gazing right" 
            elif avg_ratio < 0.35:
                gaze = "gazing left"
                
            # Add talking detection using lips
            upper_lip = landmarks[13]
            lower_lip = landmarks[14]
            mouth_dist = abs(upper_lip.y - lower_lip.y)
            if mouth_dist > 0.05 and emotion not in ['happy', 'surprise']:
                emotion = "talking"

        return f"{emotion}, {gaze}"
    except Exception as e:
        return "error, error"

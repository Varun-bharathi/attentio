import cv2
import mediapipe as mp

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=False, max_num_faces=1, refine_landmarks=True, min_detection_confidence=0.5)

def analyze_emotion(frame_arr):
    """
    Analyzes the facial expression and eyeball movements (gaze) using MediaPipe FaceMesh.
    Returns: string combining expression and gaze state (e.g., 'neutral, looking center')
    """
    try:
        results = face_mesh.process(frame_arr)
        if not results.multi_face_landmarks:
            return "not detected"
            
        landmarks = results.multi_face_landmarks[0].landmark
        
        # Eyeball movements / Gaze estimation (using iris and eye corners)
        # 468 is left iris, 33 is left outer eye, 133 is left inner eye
        left_iris = landmarks[468]
        left_eye_outer = landmarks[33]
        left_eye_inner = landmarks[133]
        
        iris_ratio = (left_iris.x - left_eye_outer.x) / (left_eye_inner.x - left_eye_outer.x + 0.0001)
        
        gaze = "center gaze"
        if iris_ratio > 0.65:
            gaze = "gazing left"
        elif iris_ratio < 0.35:
            gaze = "gazing right"

        # Facial Expression (Mouth open / Yawning)
        # 13 is upper lip inner, 14 is lower lip inner
        upper_lip = landmarks[13]
        lower_lip = landmarks[14]
        mouth_dist = abs(upper_lip.y - lower_lip.y)
        
        expression = "neutral"
        if mouth_dist > 0.05:
            expression = "yawning/talking"
            
        return f"{expression}, {gaze}"
    except Exception as e:
        return "error"

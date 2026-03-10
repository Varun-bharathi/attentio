import cv2
import base64
import numpy as np
from ai_module.emotion_detection import analyze_emotion
from ai_module.posture_detection import analyze_posture

def decode_base64_frame(data: str):
    try:
        if data.startswith("data:image"):
            data = data.split(',')[1]
        img_data = base64.b64decode(data)
        np_arr = np.frombuffer(img_data, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return frame
    except Exception as e:
        return None

def analyze_frame(base64_data: str):
    """
    Decodes the frame and calculates attention score based on posture, gesture, expression, and gaze.
    Returns dictionary with detailed stats.
    """
    frame = decode_base64_frame(base64_data)
    if frame is None:
        return {"attention": 0, "emotion": "unknown", "gaze": "unknown", "posture": "unknown", "gesture": "unknown"}

    # Convert to RGB since MediaPipe and DeepFace use it
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    emotion_gaze = analyze_emotion(rgb_frame)
    posture_gesture = analyze_posture(rgb_frame)
    
    # Split the returned strings
    try:
        emotion, gaze = emotion_gaze.split(", ")
    except:
        emotion, gaze = emotion_gaze, "unknown"
        
    try:
        posture, gesture = posture_gesture.split(", ")
    except:
        posture, gesture = posture_gesture, "unknown"

    score = 100
    
    # Penalties for posture
    if posture == "looking away":
        score -= 40
    elif posture == "not detected":
        score = 0
        
    # Penalties for gaze
    if gaze in ["gazing left", "gazing right"]:
        score -= 20
        
    # Penalties for expression
    if emotion == "yawning/talking":
        score -= 25
        
    # Penalties/Bonuses for gesture
    if gesture == "touching face":
        score -= 10
    elif gesture == "hand raised":
        # Usually positive engagement but can mean distraction; neutral impact chosen
        pass

    return {
        "attention": max(score, 0), 
        "emotion": emotion, 
        "gaze": gaze,
        "posture": posture,
        "gesture": gesture
    }

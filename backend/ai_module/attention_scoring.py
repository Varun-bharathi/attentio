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
    Decodes the frame and calculates attention score based on robust new heuristics.
    Returns dictionary with detailed stats.
    """
    frame = decode_base64_frame(base64_data)
    if frame is None:
        return {"attention": 0, "emotion": "unknown", "gaze": "unknown", "posture": "unknown", "gesture": "unknown"}

    # Convert to RGB since MediaPipe and DeepFace use it
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    emotion_gaze = analyze_emotion(rgb_frame)
    posture_gesture = analyze_posture(rgb_frame)
    
    try:
        emotion, gaze = emotion_gaze.split(", ")
    except:
        emotion, gaze = "neutral", "not detected"
        
    try:
        posture, gesture = posture_gesture.split(", ")
    except:
        posture, gesture = "not detected", "no gesture"

    score = 100
    
    # 1. Posture Penalties (Heavy impact since it indicates gross physical distraction)
    if posture == "looking away":
        score -= 50
    elif posture == "looking down":
        score -= 30
    elif posture == "not detected":
        score = 0
        
    # 2. Gaze Penalties (Medium impact - glancing away is bad, but less severe than full head turn)
    if gaze in ["gazing left", "gazing right"]:
        score -= 20
    elif gaze == "not detected" and posture != "not detected":
        score -= 10
        
    # 3. Emotion Variations (Nuanced impact)
    # Deepface emotions: 'angry', 'disgust', 'fear', 'happy', 'sad', 'surprise', 'neutral'
    if emotion in ["sad", "fear", "angry"]:
        score -= 10  # Signifies confusion or frustration
    elif emotion == "talking":
        score -= 20  # Talking likely means distracted engagement
    elif emotion == "happy":
        score += 5   # Positive engagement

    # 4. Gesture Impacts
    if gesture == "touching face":
        score -= 15  # Often indicates sleepiness, boredom, or leaning on hand
    elif gesture == "hand raised":
        score += 15  # Highly interactive and attentive!

    # Normalization
    final_score = max(0, min(100, score))

    return {
        "attention": final_score, 
        "emotion": emotion, 
        "gaze": gaze,
        "posture": posture,
        "gesture": gesture
    }

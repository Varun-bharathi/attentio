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
    Decodes the frame and calculates attention score based on posture and emotion.
    Returns dictionary with stats.
    """
    frame = decode_base64_frame(base64_data)
    if frame is None:
        return {"attention": 0, "emotion": "unknown", "posture": "unknown"}

    # Convert to RGB since MediaPipe and DeepFace use it
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    emotion = analyze_emotion(rgb_frame)
    posture = analyze_posture(rgb_frame)

    score = 100
    if posture == "looking away":
        score -= 40
    elif posture == "not detected":
        score = 0
    
    if emotion in ["sad", "angry"]:
        score -= 20
    elif emotion == "distracted":
        score -= 30

    return {"attention": max(score, 0), "emotion": emotion, "posture": posture}

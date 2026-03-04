import sys
import json
import os
import io

# Modify path to enable absolute imports within ai_module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ai_module.attention_scoring import analyze_frame

# Force stdin/stdout to process line buffered
def run_ai_service():
    print('{"service": "ready"}')  # Handshake payload for JS
    sys.stdout.flush()

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
            
        try:
            data = json.loads(line)
            sid = data.get("sid")
            frame_data = data.get("frame")
            if frame_data:
                result = analyze_frame(frame_data)
            else:
                result = {"attention": 0, "emotion": "unknown", "posture": "unknown"}
            
            out = {"sid": sid, "result": result}
            sys.stdout.write(json.dumps(out) + '\n')
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(json.dumps({"error": str(e)}) + '\n')
            sys.stdout.flush()

if __name__ == "__main__":
    run_ai_service()

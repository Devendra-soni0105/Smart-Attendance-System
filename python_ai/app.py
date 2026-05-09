"""
app.py  —  SmartLog AI Server
================================
Detection  : MediaPipe Face Detection (short-range, CPU-optimised)
Landmarks  : MediaPipe Face Detection 6-keypoint → mapped to ArcFace 5-point layout
Alignment  : Similarity transform (estimateAffinePartial2D) → 112×112 crop
Embedding  : ArcFace R50 ONNX  (webface_r50.onnx)
Normalise  : L2 unit vector (512-D)
API        : JSON — same contract as the previous YuNet version; Node.js unchanged
"""

import os
import re
import uuid
import base64
import numpy as np
import cv2
import mediapipe as mp
from flask import Flask, request, jsonify
from arcface_embedder import ArcFaceONNX

import pandas as pd

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR = os.path.join(BASE_DIR, "dataset")

if not os.path.exists(DATASET_DIR):
    os.makedirs(DATASET_DIR)

# ============================================================
# Configuration
# ============================================================

# Resize incoming frames to at most this width before detection
# (speeds up MediaPipe; landmarks are scaled back to original coords)
MAX_FRAME_W: int  = 640

# MediaPipe confidence threshold for face detection
MP_CONF: float    = 0.6

# Laplacian variance below this value → face crop considered too blurry
BLUR_THRESHOLD: float = 80.0

# Minimum face size (width in pixels on the resized frame) to accept
MIN_FACE_PX: int  = 40

# Path to ArcFace ONNX model
ARCFACE_MODEL = os.path.join(BASE_DIR, "models", "webface.onnx")

# ============================================================
# Model initialisation
# ============================================================

# MediaPipe Face Detection — short-range model (model_selection=0) is
# faster and more accurate for webcam distances (< 2 m).
_mp_face_detection = mp.solutions.face_detection
_face_detector = _mp_face_detection.FaceDetection(
    model_selection=0,          # 0 = short-range (< 2 m), 1 = full-range
    min_detection_confidence=MP_CONF,
)

# ArcFace R50 embedder
arcface = ArcFaceONNX(ARCFACE_MODEL)

print("MediaPipe Face Detection ready.")
print("ArcFace R50 embedder loaded.")


# ============================================================
# ArcFace canonical 5-point landmarks  (112 × 112 target)
# Order: right-eye, left-eye, nose-tip, mouth-right, mouth-left
# ============================================================
ARCFACE_DST = np.array(
    [
        [38.2946, 51.6963],   # right eye
        [73.5318, 51.5014],   # left eye
        [56.0252, 71.7366],   # nose tip
        [41.5493, 92.3655],   # mouth right corner
        [70.7299, 92.2041],   # mouth left corner
    ],
    dtype=np.float32,
)

# MediaPipe keypoint indices (from RelativeKeypoints list)
# 0=right-eye, 1=left-eye, 2=nose-tip, 3=mouth-center, 4=right-ear, 5=left-ear
# We synthesise mouth corners from mouth-center ± offset derived from eye span.
_KP_RIGHT_EYE  = 0
_KP_LEFT_EYE   = 1
_KP_NOSE_TIP   = 2
_KP_MOUTH_CTR  = 3


# ============================================================
# Utility helpers
# ============================================================

def safe_key(text: str) -> str:
    """Sanitise arbitrary text into a slug usable as a file/folder key."""
    text = (text or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    return text or "user"


def b64_to_bgr(data_url: str) -> np.ndarray | None:
    """Decode a base64 data-URL (or raw base64 string) to a BGR numpy image."""
    if not isinstance(data_url, str) or not data_url.strip():
        return None
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    data_url = data_url.strip().replace("\n", "").replace("\r", "").replace(" ", "")
    missing = len(data_url) % 4
    if missing:
        data_url += "=" * (4 - missing)
    try:
        img_bytes = base64.b64decode(data_url, validate=False)
    except Exception:
        return None
    np_arr = np.frombuffer(img_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img if img is not None else None


def maybe_resize(img_bgr: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Downscale img_bgr so its width ≤ MAX_FRAME_W.
    Returns (image, scale_factor).  scale_factor < 1 means it was shrunk.
    """
    if img_bgr is None or MAX_FRAME_W <= 0:
        return img_bgr, 1.0
    h, w = img_bgr.shape[:2]
    if w <= MAX_FRAME_W:
        return img_bgr, 1.0
    scale   = MAX_FRAME_W / float(w)
    resized = cv2.resize(img_bgr, (int(w * scale), int(h * scale)),
                         interpolation=cv2.INTER_AREA)
    return resized, scale


def quality_check(face_crop: np.ndarray) -> tuple[bool, str]:
    """
    Basic quality gate for an aligned face crop.
    Returns (passed: bool, reason: str).
    """
    if face_crop is None or face_crop.size == 0:
        return False, "empty crop"
    h, w = face_crop.shape[:2]
    if w < MIN_FACE_PX or h < MIN_FACE_PX:
        return False, f"face too small ({w}×{h} px)"
    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
    blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
    if blur_score < BLUR_THRESHOLD:
        return False, f"too blurry (score={blur_score:.1f}, threshold={BLUR_THRESHOLD})"
    return True, "ok"


# ============================================================
# MediaPipe face detection
# ============================================================

def detect_faces_mediapipe(img_bgr: np.ndarray) -> list[dict]:
    """
    Run MediaPipe Face Detection on img_bgr.

    Returns a list of face dicts:
        { x, y, w, h, score, landmarks: [[x,y]×5] }
    Landmark order: right-eye, left-eye, nose-tip, mouth-right, mouth-left
    (same 5-point convention as ArcFace canonical template).
    """
    if img_bgr is None:
        return []

    work, scale = maybe_resize(img_bgr)
    h_work, w_work = work.shape[:2]
    inv = 1.0 / scale if scale != 1.0 else 1.0

    # MediaPipe expects RGB
    rgb = cv2.cvtColor(work, cv2.COLOR_BGR2RGB)
    results = _face_detector.process(rgb)

    if not results.detections:
        return []

    faces = []
    for det in results.detections:
        score = det.score[0] if det.score else 0.0

        # Bounding box (relative coords → pixel coords on original image)
        bb = det.location_data.relative_bounding_box
        x = int(max(0, bb.xmin * w_work) * inv)
        y = int(max(0, bb.ymin * h_work) * inv)
        fw = max(1, int(bb.width  * w_work * inv))
        fh = max(1, int(bb.height * h_work * inv))

        # 6 relative keypoints from MediaPipe
        kps = det.location_data.relative_keypoints

        def kp_px(idx):
            """Convert a relative keypoint to pixel coords on the original image."""
            kp = kps[idx]
            return [float(kp.x * w_work * inv), float(kp.y * h_work * inv)]

        right_eye  = kp_px(_KP_RIGHT_EYE)
        left_eye   = kp_px(_KP_LEFT_EYE)
        nose_tip   = kp_px(_KP_NOSE_TIP)
        mouth_ctr  = kp_px(_KP_MOUTH_CTR)

        # Derive mouth corners from mouth-centre ± half the inter-eye distance
        eye_dx  = (left_eye[0] - right_eye[0]) * 0.25
        mouth_r = [mouth_ctr[0] - eye_dx, mouth_ctr[1]]
        mouth_l = [mouth_ctr[0] + eye_dx, mouth_ctr[1]]

        landmarks = [right_eye, left_eye, nose_tip, mouth_r, mouth_l]

        faces.append({
            "x":         x,
            "y":         y,
            "w":         fw,
            "h":         fh,
            "score":     float(score),
            "landmarks": landmarks,
        })

    return faces


# ============================================================
# Face alignment (5-point similarity transform → 112×112)
# ============================================================

def align_face(img_bgr: np.ndarray, landmarks: list) -> np.ndarray | None:
    """
    5-point similarity-transform alignment to the ArcFace canonical template.

    Parameters
    ----------
    img_bgr   : original BGR image
    landmarks : [[x,y]×5] in order: right-eye, left-eye, nose, mouth-r, mouth-l

    Returns
    -------
    112×112 BGR aligned crop, or None on failure.
    """
    src = np.array(landmarks, dtype=np.float32)
    M, _  = cv2.estimateAffinePartial2D(src, ARCFACE_DST, method=cv2.LMEDS)

    if M is None:
        # Fallback: crude bounding-box crop, resized
        lms = np.array(landmarks)
        x0  = max(0, int(lms[:, 0].min()) - 10)
        y0  = max(0, int(lms[:, 1].min()) - 20)
        x1  = min(img_bgr.shape[1], int(lms[:, 0].max()) + 10)
        y1  = min(img_bgr.shape[0], int(lms[:, 1].max()) + 20)
        crop = img_bgr[y0:y1, x0:x1]
        return cv2.resize(crop, (112, 112)) if crop.size > 0 else None

    aligned = cv2.warpAffine(img_bgr, M, (112, 112), flags=cv2.INTER_LINEAR)
    return aligned

def get_profile_crop(img, box, padding=0.1):
    """Gets a high-res square crop from bounding box with minimal padding (tight face)."""
    ih, iw = img.shape[:2]
    x, y, w, h = box['x'], box['y'], box['w'], box['h']
    
    cx, cy = x + w/2, y + h/2
    size = max(w, h) * (1 + padding)
    
    x1 = int(max(0, cx - size/2))
    y1 = int(max(0, cy - size/2))
    x2 = int(min(iw, cx + size/2))
    y2 = int(min(ih, cy + size/2))
    
    crop = img[y1:y2, x1:x2]
    if crop.size > 0:
        return cv2.resize(crop, (300, 300), interpolation=cv2.INTER_CUBIC)
    return None


# ============================================================
# Selection helpers
# ============================================================

def pick_best_face(faces: list[dict]) -> dict | None:
    """Return the face with the highest detection confidence score."""
    if not faces:
        return None
    return max(faces, key=lambda f: f["score"])


def box_only(face: dict) -> dict:
    """Strip landmarks from a face dict — safe to return in JSON responses."""
    return {k: face[k] for k in ("x", "y", "w", "h", "score")}


# ============================================================
# Flask API routes
# ============================================================

@app.post("/detect-face")
def detect_face_api():
    """
    POST /detect-face
    Body : { "image": "<base64 data-URL>" }
    Response: { ok, face_count, box }
    """
    try:
        body = request.get_json(force=True) or {}
        img  = b64_to_bgr(body.get("image", ""))

        if img is None:
            return jsonify({"ok": False, "message": "Invalid image"}), 200

        faces = detect_faces_mediapipe(img)
        best  = pick_best_face(faces)

        if not best:
            return jsonify({"ok": True, "face_count": 0, "box": None}), 200

        return jsonify({
            "ok":         True,
            "face_count": len(faces),
            "box":        box_only(best),
        }), 200

    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 400


def save_to_dataset_csv(fullname, enrollno, embedding):
    """Appends embedding to a central students.csv file for training."""
    username = f"{safe_key(fullname)}_{safe_key(enrollno)}"
    filepath = os.path.join(DATASET_DIR, "students.csv")

    columns = ["username"] + [f"emb_{i}" for i in range(512)]
    
    # Create the row as a list
    row = [username] + embedding.tolist()
    df = pd.DataFrame([row], columns=columns)

    # Append to CSV: if file doesn't exist, write header; else append without header
    header = not os.path.exists(filepath) or os.stat(filepath).st_size == 0
    df.to_csv(filepath, mode='a', header=header, index=False)
    print(f"Embedding saved to CSV: {filepath} for {username}")
    
    return filepath

@app.post("/enroll")
def enroll_api():
    """
    POST /enroll
    Body : { "fullname", "enrollno", "dept", "image": "<base64>", "is_training": bool }
    """
    try:
        body        = request.get_json(force=True) or {}
        fullname    = (body.get("fullname") or "").strip()
        enrollno    = (body.get("enrollno") or "").strip()
        dept        = (body.get("dept")     or "").strip()
        is_training = body.get("is_training", False)
        img         = b64_to_bgr(body.get("image", ""))

        if not fullname or not enrollno or not dept:
            return jsonify({"ok": False, "message": "fullname, enrollno, dept required"}), 200
        if img is None:
            return jsonify({"ok": False, "message": "Invalid image"}), 200

        faces = detect_faces_mediapipe(img)
        best  = pick_best_face(faces)

        if not best:
            return jsonify({"ok": False, "message": "No face detected"}), 200

        # Alignment
        face_crop = align_face(img, best["landmarks"])
        if face_crop is None:
            return jsonify({"ok": False, "message": "Face alignment failed"}), 200

        # Quality gate
        ok, reason = quality_check(face_crop)
        if not ok:
            return jsonify({"ok": False, "message": f"Poor image quality: {reason}"}), 200

        # Embedding (Only compute if we are training/adding samples)
        emb = np.array([])
        csv_path = None
        
        if is_training:
            emb = arcface.get_embedding(face_crop)
            if emb is None or len(emb) < 100:
                return jsonify({"ok": False, "message": "Embedding computation failed"}), 200
            csv_path = save_to_dataset_csv(fullname, enrollno, emb)

        person_key = f"{safe_key(fullname)}_{safe_key(enrollno)}"
        sample_id  = uuid.uuid4().hex[:12]

        # 1. Aligned crop for recognition
        face_crop = align_face(img, best["landmarks"])
        
        # 2. Premium profile crop for display
        profile_crop = get_profile_crop(img, best)

        if face_crop is None:
            return jsonify({"ok": False, "message": "Face alignment failed"}), 200

        # Encode both to base64 as PNG
        _, f_buf = cv2.imencode(".png", face_crop)
        face_base64 = base64.b64encode(f_buf).decode("utf-8")
        
        profile_base64 = face_base64 # Fallback
        if profile_crop is not None:
            _, p_buf = cv2.imencode(".png", profile_crop)
            profile_base64 = base64.b64encode(p_buf).decode("utf-8")

        return jsonify({
            "ok":            True,
            "fullname":      fullname,
            "enrollno":      enrollno,
            "dept":          dept,
            "personKey":     person_key,
            "sampleId":      sample_id,
            "box":           box_only(best),
            "embedding":     emb.astype(float).tolist(),
            "face_image":    f"data:image/png;base64,{face_base64}",
            "profile_image": f"data:image/png;base64,{profile_base64}",
            "excel_saved":   bool(csv_path),
            "csv_saved":     bool(csv_path),
            "quality":       reason,
        }), 200

    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 400


@app.post("/reprocess_local")
def reprocess_local():
    """
    Reads an image from disk (within public folder), crops/aligns, 
    and returns fresh embedding + face_image.
    Used for bulk rebuilding the dataset CSV.
    """
    try:
        body = request.get_json(force=True) or {}
        rel_path = body.get("filepath", "") # e.g. /Students_enrolled/himanshu...jpg
        
        # Robustly find the 'public' folder
        # Try current dir, parent dir, or grandparent
        project_root = BASE_DIR
        for _ in range(3):
            if os.path.exists(os.path.join(project_root, "public")):
                break
            project_root = os.path.dirname(project_root)
        
        abs_path = os.path.abspath(os.path.join(project_root, "public", rel_path.lstrip("/")))
        
        print(f"Reprocess request for: {rel_path} -> Resolved to: {abs_path}")

        if not os.path.exists(abs_path):
            print(f"ERROR: File not found at {abs_path}")
            return jsonify({"ok": False, "message": f"File not found: {abs_path}"}), 404

        img = cv2.imread(abs_path)
        if img is None:
            return jsonify({"ok": False, "message": "Failed to read image"}), 400

        faces = detect_faces_mediapipe(img)
        best  = pick_best_face(faces)

        if not best:
            return jsonify({"ok": False, "message": "No face detected in file"}), 200

        # Guaranteed Aggressive Align/Crop
        face_crop = align_face(img, best["landmarks"])
        if face_crop is None:
            # Fallback to BBox crop if alignment fails
            x, y, w, h = best["x"], best["y"], best["w"], best["h"]
            face_crop = cv2.resize(img[y:y+h, x:x+w], (112, 112))

        emb = arcface.get_embedding(face_crop)
        
        _, f_buf = cv2.imencode(".png", face_crop)
        face_base64 = base64.b64encode(f_buf).decode("utf-8")

        return jsonify({
            "ok": True,
            "embedding": emb.astype(float).tolist(),
            "face_image": f"data:image/png;base64,{face_base64}"
        }), 200

    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 400


@app.post("/recognize")
def recognize_api():
    """
    POST /recognize
    Body : { "image": "<base64>" }
    Response : { ok, face_count, box, embedding }

    Matching (threshold + margin gate) is performed in Node.js so that
    the gallery can be queried from MongoDB without round-trips.
    """
    try:
        body = request.get_json(force=True) or {}
        img  = b64_to_bgr(body.get("image", ""))

        if img is None:
            return jsonify({"ok": False, "message": "Invalid image"}), 200

        faces = detect_faces_mediapipe(img)
        if not faces:
            return jsonify({"ok": True, "face_count": 0, "results": []}), 200

        from recog_model import predict_user
        
        results = []
        # Process up to 5 faces for speed/performance
        for face in faces[:5]:
            # 1. Align
            face_crop = align_face(img, face["landmarks"])
            if face_crop is None:
                continue
                
            # 2. Embedding
            emb = arcface.get_embedding(face_crop)
            if emb is None or len(emb) < 100:
                continue

            # 3. Predict
            predicted_user, confidence = predict_user(emb)
            
            # 4. Profile Crop for UI
            profile_crop = get_profile_crop(img, face)
            
            # Encode images
            _, f_buf = cv2.imencode(".png", face_crop)
            face_base64 = base64.b64encode(f_buf).decode("utf-8")
            
            profile_base64 = face_base64
            if profile_crop is not None:
                _, p_buf = cv2.imencode(".png", profile_crop)
                profile_base64 = base64.b64encode(p_buf).decode("utf-8")

            results.append({
                "box":            box_only(face),
                "predicted_user": predicted_user,
                "confidence":     confidence,
                "face_image":     f"data:image/png;base64,{face_base64}",
                "profile_image":  f"data:image/png;base64,{profile_base64}",
            })

        return jsonify({
            "ok": True,
            "face_count": len(faces),
            "results": results
        }), 200

    except Exception as e:
        return jsonify({"ok": False, "message": str(e)}), 400


@app.post("/train")
def train_api():
    """
    POST /train
    Triggers the training process by reading the CSV and updating the KNN model.
    """
    try:
        from recog_model import train_model
        train_model()
        return jsonify({"ok": True, "message": "Model training completed successfully"}), 200
    except Exception as e:
        return jsonify({"ok": False, "message": f"Training failed: {str(e)}"}), 500


@app.post("/delete-student")
def delete_student_api():
    """Removes a student's embeddings from the CSV dataset."""
    try:
        body = request.get_json()
        fullname = body.get("fullname")
        enrollno = body.get("enrollno")

        if not fullname or not enrollno:
            return jsonify({"ok": False, "message": "fullname and enrollno are required"}), 400

        username = f"{safe_key(fullname)}_{safe_key(enrollno)}"
        filepath = os.path.join(DATASET_DIR, "students.csv")

        if not os.path.exists(filepath):
            return jsonify({"ok": True, "message": "CSV not found, nothing to delete"}), 200

        # Read CSV and filter out the student
        df = pd.read_csv(filepath)
        initial_len = len(df)
        df = df[df['username'] != username]
        
        if len(df) < initial_len:
            df.to_csv(filepath, index=False)
            print(f"Deleted {initial_len - len(df)} samples for {username} from CSV")
            
            # Re-train model automatically after deletion to keep KNN up to date
            try:
                from recog_model import train_model
                train_model()
            except:
                pass
                
            return jsonify({"ok": True, "message": f"Deleted {initial_len - len(df)} samples from dataset"}), 200
        else:
            return jsonify({"ok": True, "message": "Student not found in dataset"}), 200

    except Exception as e:
        print(f"Error deleting student from CSV: {str(e)}")
        return jsonify({"ok": False, "message": str(e)}), 500


# ============================================================
# Entry point
# ============================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5007, debug=False)
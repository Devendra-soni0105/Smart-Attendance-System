import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(os.path.join(BASE_DIR, "python_ai"))

from python_ai.recog_model import predict_user, _knn_model, _label_encoder
import joblib

MODEL_SAVE_PATH = os.path.join(BASE_DIR, "python_ai", "models", "face_recog_knn.joblib")
if os.path.exists(MODEL_SAVE_PATH):
    knn = joblib.load(MODEL_SAVE_PATH)
    print("Classes:", len(knn.classes_))
    print("n_neighbors:", knn.n_neighbors)
    
    # generate a dummy embedding
    import numpy as np
    dummy_emb = np.random.rand(512).tolist()
    print("Prediction:", predict_user(dummy_emb))
else:
    print("Model not found")

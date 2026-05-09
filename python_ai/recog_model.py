import os
import pandas as pd
import joblib
import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import LabelEncoder, Normalizer

# ==============================
# CONFIG
# ==============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CSV_FILE = os.path.join(BASE_DIR, "dataset", "students.csv")
MODEL_SAVE_PATH = os.path.join(BASE_DIR, "models", "face_recog_knn.joblib")
ENCODER_SAVE_PATH = os.path.join(BASE_DIR, "models", "label_encoder.joblib")

# Global variables to cache the model and encoder
_knn_model = None
_label_encoder = None

def train_model():
    """
    Reads the students.csv dataset, trains a KNN classifier
    on the 512-D embeddings, and saves the model + label encoder.
    """
    if not os.path.exists(CSV_FILE):
        print(f"Error: Dataset not found at {CSV_FILE}")
        print("   Make sure you have enrolled students and collected samples first.")
        return

    try:
        print(f"Loading dataset: {CSV_FILE}")
        df = pd.read_csv(CSV_FILE)
        
        if len(df) < 2:
            print("Error: Need at least 2 samples to train the model.")
            return

        # Randomize/Shuffle the dataset before training
        print("Shuffling dataset...")
        df = df.sample(frac=1, random_state=42).reset_index(drop=True)

        print(f"Training on {len(df)} samples...")

        # 1. Split Features (Embeddings) and Labels (Usernames)
        # Assuming first column is 'username' and rest are 'emb_0'...'emb_511'
        X = df.drop(columns=['username'])
        y = df['username']

        # 2. Encode Labels (Names -> Numbers)
        le = LabelEncoder()
        y_encoded = le.fit_transform(y)

        # 3. Normalize Features (L2 Normalization for better Cosine Similarity equivalent in KNN)
        norm = Normalizer(norm='l2')
        X_norm = norm.fit_transform(X)

        # 4. Initialize and Train KNN Classifier
        # Using n_neighbors=7 and weights='distance' for robustness with 150 samples per class
        knn = KNeighborsClassifier(n_neighbors=5, weights='distance', metric='euclidean')
        knn.fit(X_norm, y_encoded)

        # 5. Ensure models directory exists
        os.makedirs(os.path.dirname(MODEL_SAVE_PATH), exist_ok=True)

        # 6. Save the trained artifacts
        joblib.dump(knn, MODEL_SAVE_PATH)
        joblib.dump(le, ENCODER_SAVE_PATH)

        # Update cache
        global _knn_model, _label_encoder
        _knn_model = knn
        _label_encoder = le

        print("-" * 50)
        print(f"SUCCESS: Model Trained and Saved!")
        print(f"Model: {MODEL_SAVE_PATH}")
        print(f"Encoder: {ENCODER_SAVE_PATH}")
        print(f"Total Students: {len(le.classes_)}")
        print(f"Total Samples: {len(df)}")
        print("-" * 50)

    except Exception as e:
        print(f"Training Failed: {str(e)}")

def predict_user(embedding):
    """
    Predicts the username for a given 512-D embedding using the trained KNN model.
    Returns (username, distance) if prediction is within 70% confidence, else ("Unknown", distance).
    """
    global _knn_model, _label_encoder

    # Load model if not in memory
    if _knn_model is None or _label_encoder is None:
        if os.path.exists(MODEL_SAVE_PATH) and os.path.exists(ENCODER_SAVE_PATH):
            _knn_model = joblib.load(MODEL_SAVE_PATH)
            _label_encoder = joblib.load(ENCODER_SAVE_PATH)
        else:
            print("Error: KNN model or Label Encoder not found. Please train first.")
            return None, 1.0

    try:
        # Ensure embedding is a 2D array
        emb = np.array(embedding).reshape(1, -1)
        
        # L2 Normalization (input must match training normalization)
        norm = Normalizer(norm='l2')
        emb_norm = norm.fit_transform(emb)

        # Find the nearest neighbor's distance and index
        distances, indices = _knn_model.kneighbors(emb_norm, n_neighbors=1)
        min_distance = distances[0][0]
        
        # Calculate Confidence Score (0.0-1.0)
        # Cosine Similarity = 1 - (distance^2 / 2)
        similarity = 1.0 - (float(min_distance) ** 2 / 2.0)
        confidence = max(0.0, min(1.0, similarity))

        # Predict the class
        prediction = _knn_model.predict(emb_norm)
        username = _label_encoder.inverse_transform(prediction)[0]

        print(f"Prediction: {username} (dist: {min_distance:.4f}, confidence: {confidence*100:.2f}%)")

        # 70% Confidence Threshold check (0.7)
        if confidence >= 0.7:
            return username, float(confidence)
        else:
            return "Unknown", float(confidence)

    except Exception as e:
        print(f"Prediction Failed: {str(e)}")
        return None, 0.0

if __name__ == "__main__":
    train_model()
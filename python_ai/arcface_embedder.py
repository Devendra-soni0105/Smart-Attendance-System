"""
arcface_embedder.py
-------------------
ArcFace R50 ONNX inference wrapper.
  - L2-normalised 512-D embeddings
  - Optional batch / mean-embedding helper for gallery averaging
  - Automatic CUDA / CPU provider selection
"""

import cv2
import numpy as np
import onnxruntime as ort


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def l2_normalize(x: np.ndarray) -> np.ndarray:
    """Return a unit-length copy of vector x."""
    return x / (np.linalg.norm(x) + 1e-10)


def _preprocess(face_img: np.ndarray) -> np.ndarray:
    """
    Resize to 112×112, convert BGR→RGB, normalise to [-1, 1].
    Returns a float32 array with shape (1, 112, 112, 3).
    """
    face = cv2.resize(face_img, (112, 112))
    face = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
    face = face.astype(np.float32)
    face = (face - 127.5) / 128.0          # [-1, 1]
    return np.expand_dims(face, axis=0)    # (1, 112, 112, 3)  NHWC


# ---------------------------------------------------------------------------
# ArcFace ONNX wrapper
# ---------------------------------------------------------------------------

class ArcFaceONNX:
    """
    Thin wrapper around an ArcFace ONNX model (NHWC input, e.g. webface_r50.onnx).
    """

    def __init__(self, model_path: str):
        # Prefer CUDA when available, fall back to CPU automatically
        requested_providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        available_providers = ort.get_available_providers()
        providers = [p for p in requested_providers if p in available_providers]
        if not providers:
            providers = ["CPUExecutionProvider"]
            
        self.session = ort.InferenceSession(model_path, providers=providers)
        self.input_name  = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    # ------------------------------------------------------------------
    # Single-image embedding
    # ------------------------------------------------------------------

    def get_embedding(self, face_img: np.ndarray) -> np.ndarray | None:
        """
        Compute an L2-normalised 512-D embedding for a single aligned crop.

        Parameters
        ----------
        face_img : np.ndarray  BGR image (any size; will be resized to 112×112)

        Returns
        -------
        np.ndarray of shape (512,), L2-normalised, or None on failure.
        """
        if face_img is None or face_img.size == 0:
            return None
        try:
            blob = _preprocess(face_img)
            raw  = self.session.run([self.output_name], {self.input_name: blob})[0][0]
            return l2_normalize(raw)
        except Exception:
            return None

    # ------------------------------------------------------------------
    # Multi-image / gallery mean embedding
    # ------------------------------------------------------------------

    def get_mean_embedding(self, face_img_list: list[np.ndarray]) -> np.ndarray | None:
        """
        Compute a mean L2-normalised 512-D embedding from a list of aligned crops.
        Useful for gallery averaging — one representative vector per identity.

        Parameters
        ----------
        face_img_list : list of BGR images

        Returns
        -------
        np.ndarray of shape (512,), L2-normalised mean, or None if all fail.
        """
        embeddings = []
        for img in face_img_list:
            emb = self.get_embedding(img)
            if emb is not None:
                embeddings.append(emb)

        if not embeddings:
            return None

        mean_emb = np.mean(embeddings, axis=0)
        return l2_normalize(mean_emb)


# ---------------------------------------------------------------------------
# Standalone similarity helper
# ---------------------------------------------------------------------------

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity in [-1, 1] between two 1-D vectors."""
    return float(
        np.dot(a, b) / ((np.linalg.norm(a) + 1e-10) * (np.linalg.norm(b) + 1e-10))
    )
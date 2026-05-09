# FaceGuard v2: Smart AI Attendance System

FaceGuard v2 is a high-performance, real-time facial recognition attendance system built with a modern Next.js frontend and a robust Python AI backend. It utilizes state-of-the-art deep learning models to provide accurate, multi-face recognition for educational or corporate environments.

---

## 🚀 Key Features
- **Multi-Face Recognition**: Detect and recognize up to 5 faces simultaneously in a single frame to reduce attendance time.
- **Auto & Manual Modes**: Flexible attendance marking with real-time feedback.
- **Deep Learning Accuracy**: Powered by ArcFace (R50) for 512-D facial embeddings.
- **Real-time AI Training**: Rebuild and retrain the KNN classifier instantly via the dashboard.
- **Manual Overrides**: Faculty can manually adjust, correct, or view historical attendance records.
- **Live Face Confirmation**: Displays live camera crops alongside registration photos for visual verification.
- **Secure Route Protection**: Advanced Next.js Middleware prevents unauthorized access to the dashboard.
- **Session Management**: JWT-based authentication with secure, HTTP-only cookies and cache control to prevent back-button data leaks.

---

## 🔐 Security & Authentication
FaceGuard v2 implements a multi-layer security model:
1. **Middleware Guard**: A centralized `middleware.js` intercepts every request to the dashboard. If no valid `session_token` is found, the user is instantly redirected to the login page.
2. **JWT Sessions**: Authentication is handled via JSON Web Tokens (JWT) signed with a server-side secret.
3. **HTTP-Only Cookies**: Tokens are stored in secure, HTTP-only cookies to prevent XSS (Cross-Site Scripting) attacks.
4. **Cache Control**: Protected routes use `no-store` headers to ensure that sensitive data is not cached by the browser and cannot be accessed via the "Back" button after logout.

---

## How to run
#### To start python server
command:
```
cd python_ai
.\.venv\Scripts\Activate.ps1
python .\app.py
```
#### To start Next.js
command:
```
npm run dev

```

## 🛠️ Technology Stack

### Frontend & Backend (Orchestration)
- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Database**: [MongoDB](https://www.mongodb.com/) (Mongoose ODM)
- **Styling**: Vanilla CSS & Tailwind-inspired components
- **Communication**: REST API Proxying to Python AI

### AI Backend (Python)
- **Face Detection**: [MediaPipe](https://google.github.io/mediapipe/) (BlazeFace)(**face_detection_yunet_2023mar.onnx**)
- **Face Embedding**: [ArcFace](https://github.com/deepinsight/insightface) (ResNet-50)(**webface.onnx**) via ONNX Runtime
- **Classification**: [Scikit-learn](https://scikit-learn.org/) (K-Nearest Neighbors - KNN)
- **Image Processing**: [OpenCV](https://opencv.org/)

---

## 🔄 Core Workflows

### 1. Student Enrollment
1. **Profile Creation**: Faculty enters student details (Name, Enrollment No, Dept).
2. **Profile Photo**: A high-quality profile photo is captured and stored in the database.
3. **Sample Collection**: To ensure accuracy, the student provides ~150 face samples (varying angles).
4. **Dataset Integration**: These samples are processed into **512-D ArcFace embeddings** and saved to a global dataset (`students.csv`).

### 2. AI Training
- The system uses a **KNN (K-Nearest Neighbors)** approach. 
- When the faculty clicks "Train Model", the Python backend reads the L2-normalized embeddings from the CSV and builds a fresh KNN model (`face_recog_knn.joblib`).
- This allows for "Few-Shot" learning, where the system becomes highly accurate with just a few dozen samples per student.

### 3. Multi-Face Attendance
1. **Frame Capture**: The dashboard captures frames every 3 seconds (in Auto Mode) or on demand.
2. **Detection**: MediaPipe identifies all faces in the frame.
3. **Alignment**: Each detected face is aligned using 5-point landmarks (eyes, nose, mouth) to the ArcFace canonical template (112x112).
4. **Recognition**:
   - Each aligned face is passed through the ArcFace model to generate a unique embedding.
   - The KNN model compares this embedding against the trained dataset.
   - **Confidence Logic**: A similarity score is calculated. If the score is **≥ 70%**, the student is recognized. Otherwise, they are marked as **Unknown**.
5. **Automatic Marking**: Recognized students are instantly marked "Present" in MongoDB for the selected Subject and Lecture slot.

---

## 📂 Project Structure

```text
├── app/                  # Next.js App Router (Dashboard, APIs)
├── components/           # UI Components (Camera, Sidebar, Icons)
├── models/               # Mongoose Database Models (Student, Attendance, Subject)
├── public/               # Static Assets & Enrolled Student Photos
├── python_ai/            # AI Recognition Engine
│   ├── app.py            # Flask API for AI Operations
│   ├── arcface_embedder.py# ONNX Inference for ArcFace
│   ├── recog_model.py    # KNN Training & Prediction Logic
│   ├── dataset/          # CSV storage for face embeddings
│   └── models/           # Trained .joblib model files
└── README.md             # This file
```

---

## ⚙️ Configuration
- **AI Port**: The Python server runs on `5007` by default.
- **Confidence Threshold**: Set to **70%** in `recog_model.py`.
- **Lecture Slots**: Defined in `AttendancePage.js` (e.g., lec-1, lec-2, lec-3).

---

## 🛠️ Setup Instructions

1. **Database**: Ensure a MongoDB instance is running and linked via `.env`.
2. **Python Environment**:
   ```bash
   cd python_ai
   pip install -r requirements.txt
   python app.py
   ```
3. **Node Environment**:
   ```bash
   npm install
   npm run dev
   ```
4. **Initialization**: Enroll at least two students and capture samples, then click **"Train AI Model"** in the Students section.

---

## 📝 License
This project is developed for educational purposes as a Smart Attendance Solution.

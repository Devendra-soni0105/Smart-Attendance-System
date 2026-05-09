// models/Attendance.js — ESM
import mongoose from "mongoose";

const AttendanceSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },

    // Store date in IST format (YYYY-MM-DD) to avoid timezone bugs
    date: { type: String, required: true, index: true },

    status: { type: String, enum: ["Present", "Absent"], default: "Present" },

    // ArcFace cosine score
    confidence: { type: Number, default: 0 },

    lectureKey: { type: String, default: "" },

    // How the attendance was recorded
    mode: { type: String, enum: ["auto", "manual"], default: "auto" },

    // optional: store box for debugging
    faceBox: {
      x: Number,
      y: Number,
      w: Number,
      h: Number,
      score: Number,
    },
  },
  { timestamps: true }
);

// Prevent duplicate attendance per student per subject per date per lecture
AttendanceSchema.index({ studentId: 1, subjectId: 1, date: 1, lectureKey: 1 }, { unique: true });

export default mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
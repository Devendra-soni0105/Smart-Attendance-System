// models/Log.js — ESM
import mongoose from "mongoose";

const LogSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true },
    enrollno: { type: String, required: true },
    dept: { type: String, default: "" },
    subjectName: { type: String, default: "" },
    confidence: { type: Number, default: 0 },
    status: { type: String, default: "Present" },
    imageId: { type: String, default: "" },
    profilePic: { type: String, default: "" },
    lectureKey: { type: String, default: "" },
    date: { type: String, default: "" },
    mode: { type: String, enum: ["auto", "manual"], default: "auto" },
  },
  { timestamps: true }
);

// Force clear cache for development schema updates
delete mongoose.models.Log;
export default mongoose.models.Log || mongoose.model("Log", LogSchema);
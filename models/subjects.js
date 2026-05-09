// models/Subject.js — ESM
import mongoose from "mongoose";

const SubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    // Unique subject code (TR/PR)
    code: { type: String, required: true, trim: true, uppercase: true, index: true },

    dept: { type: String, required: true, trim: true, uppercase: true, index: true },

    semester: { type: Number, required: false },

    faculty: { type: String, default: "", trim: true },

    // TR / PR / OTHER
    type: { type: String, enum: ["TR", "PR", "OTHER"], default: "OTHER", index: true },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SubjectSchema.index({ code: 1 }, { unique: true });

export default mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
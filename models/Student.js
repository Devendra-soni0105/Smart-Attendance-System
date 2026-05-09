import mongoose from "mongoose";

const StudentSchema = new mongoose.Schema(
  {
    fullname: { type: String, required: true, trim: true },

    enrollno: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    dept: { type: String, default: "", trim: true },

    personKey: {
      type: String,
      required: true,
      index: true,
    },

    profilePic: { type: String, default: "" },

    // Track the number of samples saved in the AI CSV
    sampleCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Force clear cache for development schema updates
delete mongoose.models.Student;
export default mongoose.models.Student || mongoose.model("Student", StudentSchema);
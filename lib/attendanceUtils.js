import Attendance from '@/models/Attendance';
import Student from '@/models/Student';
import Subject from '@/models/subjects';
import Log from '@/models/Logs';

/**
 * Initializes attendance records as "Absent" for all students in the same department 
 * as the subject, if no record exists for the given date and lecture.
 */
export async function initializeAbsentStudents(subjectId, date, lectureKey) {
  try {
    const subject = await Subject.findById(subjectId).lean();
    if (!subject) return;

    // Find all students in the same department (inclusive partial match)
    const escapedDept = subject.dept.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const students = await Student.find({ 
      dept: { $regex: new RegExp(escapedDept, 'i') } 
    }).lean();

    console.log(`[Auto-Absent] Found ${students.length} students for dept: ${subject.dept}`);
    
    // For each student, ensure an attendance record exists
    // We use findOneAndUpdate with $setOnInsert to avoid overwriting existing "Present" marks
    const ops = students.map(student => ({
      updateOne: {
        filter: { 
          studentId: student._id, 
          subjectId: subject._id, 
          date: date, 
          lectureKey: lectureKey || "" 
        },
        update: {
          $setOnInsert: {
            status: "Absent",
            confidence: 0,
            mode: "auto",
          }
        },
        upsert: true
      }
    }));

    if (ops.length > 0) {
      await Attendance.bulkWrite(ops);
    }

    // Note: We don't necessarily create logs for everyone marked absent to avoid cluttering,
    // but the user might want them to show up in the Logs section.
    // However, the Logs section currently shows what's in the Log model.
    // If we want "Absent" students to show up in Logs, we should also bulk-upsert Logs.
    
    const logOps = students.map(student => ({
      updateOne: {
        filter: { 
          enrollno: student.enrollno, 
          subjectName: subject.name, 
          date: date, 
          lectureKey: lectureKey || "" 
        },
        update: {
          $setOnInsert: {
            fullname: student.fullname,
            dept: student.dept,
            profilePic: student.profilePic,
            confidence: 0,
            status: "Absent",
            mode: "auto",
          }
        },
        upsert: true
      }
    }));

    if (logOps.length > 0) {
      await Log.bulkWrite(logOps);
    }

  } catch (error) {
    console.error("Error initializing absent students:", error);
  }
}

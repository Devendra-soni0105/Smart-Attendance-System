const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/smartlog_new');
  const Student = mongoose.model('Student', new mongoose.Schema({
    fullname: String,
    enrollno: String,
    profilePic: String,
    samples: Array
  }));

  const students = await Student.find({});
  console.log(JSON.stringify(students, null, 2));
  process.exit(0);
}

run();

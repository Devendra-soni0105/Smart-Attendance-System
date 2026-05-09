const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/smartlog_new');
  const Student = mongoose.model('Student', new mongoose.Schema({
    fullname: String,
    enrollno: String,
    profilePic: String,
    samples: Array
  }));

  const enrollno = "23ENG3CAII1024";
  const filename = "himanshu_soni_23eng3caii1024.jpg";
  const url = `/Students_enrolled/${filename}`;

  const res = await Student.updateOne(
    { enrollno },
    { $set: { profilePic: url } }
  );

  console.log('Update result:', res);
  process.exit(0);
}

run();

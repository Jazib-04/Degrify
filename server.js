// server.js
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app); // ⬅️ Create the raw HTTP server
const io = new Server(server);         // ⬅️ Attach socket.io to it

// Make `io` available in your app
app.set('io', io);

// Optional: handle new socket connections
io.on('connection', socket => {
  console.log('📡 Staff connected:', socket.id);
});




// Middleware to parse JSON and URL-encoded data
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // use true only with HTTPS
}));
// Serve static files (including index.html) from the "public" directory
app.use(express.static('theme'));
// MongoDB connection string (use your Atlas URI)
const uri = process.env.DATABASE_URI; // Replace this
const cloudName = process.env.CLOUDNINARY_CLOUD_NAME;
const unsignedUploadPreset = process.env.CLOUDNINARY_UNSIGNED_UPLOAD_PRESET;

let db;

// Connect to MongoDB
MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(client => {
    db = client.db('jazib_fyp'); // your database name
    console.log("Connected to MongoDB");
  })
  .catch(err => console.error("MongoDB connection failed:", err));


app.post('/login', async (req, res) => {
  
  const { cnic, password } = req.body;
  console.log("🔐 Received login attempt:", req.body);
  
  try {
    const user = await db.collection('students').findOne({ cnic_number: cnic });

    if (!user) {
      return res.json({ success: false, message: 'No user found with this CNIC.' });
    }

    if (user.password !== password) {
      return res.json({ success: false, message: 'Incorrect password.' });
    }

    req.session.user = {
      _id: user._id,
      student: user
    };

    res.json({
      success: true,
      message: 'Login successful',
      student: user
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});




app.get('/testing', (req, res) => {
  io.emit("testing", { msg: "Hello Staff! This is a test push!" });
  res.json({ success: true});  
})






app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login.html');
  }
  res.sendFile(__dirname + '/studentDashboard.html');
});







app.get('/student-data', (req, res) => {
  const user = req.session.user;

  if (!user) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  console.log("student data:", user.student.cnic_number);
  res.json({ success: true, student: user.student});
});








app.post('/admin-login', async (req, res) => {
  const { staffid, password } = req.body;

  if (!staffid || !password) {
    return res.status(400).json({ success: false, message: "Staff ID and password are required." });
  }

  try {
    const staffCollection = db.collection('staff_collection');

    // Try finding the staff record by email or username (you can adjust field name)
    const staff = await staffCollection.findOne({ staff_id: staffid }); // or { email: staffid }

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found." });
    }

    if (staff.password !== password) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // Save session (if using sessions)
    req.session.staff = staff;

    return res.json({ success: true, message: "Admin login successful." });

  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});


app.get('/staffDashboard', (req, res) => {
  if (!req.session.staff) {
    return res.redirect('/index.html');
  }
  res.sendFile(__dirname + '/staffDashboard.html'); // adjust path if needed
});

app.get('/staff-data', async (req, res) => {
  const staffs = req.session.staff;

  if (!staffs) {
    return res.redirect('/index.html');
  }

  try {
    const staff = await db.collection('staff_collection').findOne({ staff_id: staffs.staff_id });

    if (!staff) {
      return res.status(404).json({ success: false, message: "Staff not found." });
    }

    // Aggregate application status counts
    const pipeline = [
      {
        $match: {
          'application.status': { $in: ['pending', 'processing', 'completed'] }
        }
      },
      {
        $group: {
          _id: '$application.status',
          count: { $sum: 1 }
        }
      }
    ];

    const statusCounts = await db.collection('students').aggregate(pipeline).toArray();

    let pending = 0, processing = 0, completed = 0;

    statusCounts.forEach(({ _id, count }) => {
      if (_id === 'pending') pending = count;
      else if (_id === 'processing') processing = count;
      else if (_id === 'completed') completed = count;
    });

    const totalApplications = pending + processing + completed;

    const allStudents = await db.collection('students').find().toArray();

    return res.json({
      success: true,
      staff: staff,
      total_applications: totalApplications,
      pending,
      processing,
      completed,
      all_students: allStudents
    });

  } catch (error) {
    console.error('Error fetching staff data:', error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

// POST /signup
app.post('/signup', async (req, res) => {
  const {
    roll_no, student_name, father_name, department, program,
    cnic_number, mobile_no, institute, password, confirmPassword
  } = req.body;
  if (password !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match" });
  }

  try {
    const usersCollection = db.collection('students');

    const existingUser = await usersCollection.findOne({ cnic_number });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "CNIC is already registered." });
    }
    
    const student = {
      id: "student",
      roll_no,
      student_name,
      father_name,
      department,
      program,
      cnic_number,
      mobile_no,
      institute,
      password,
      notifications: null, 
      application: {
        id: null,
        submittedAt: null,
        status: "Inactive",
        uploadedDocs: {
          finalTranscriptUrl: null,
          cnicUrl: null,
          libraryClearanceUrl: null,
          accountsClearanceUrl: null,
          bankReceiptUrl: null
        },
        reviewedBy: null,
        reviewStartTime: null
      }
    };

    await usersCollection.insertOne(student);
    return res.status(200).json({ success: true, message: "Student registered successfully" });

  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ success: false, message: "Server error during signup" });
  }
});




const upload = multer({ dest: 'uploads/' }); // temp file storage

cloudinary.config({
  cloud_name: process.env.CLOUDNINARY_CLOUD_NAME,
  api_key: process.env.CLOUDNINARY_API_KEY, // Needed even for unsigned
  api_secret: process.env.CLOUDNINARY_API_SECRET
});

app.post('/upload-application', upload.fields([
  { name: 'final_transcript' },
  { name: 'cnic_copy' },
  { name: 'library_clearance' },
  { name: 'accounts_clearance' },
  { name: 'degree_fee_receipt' }
]), async (req, res) => {
  const files = req.files;
  const resultUrls = {};

  const uploadToCloudinary = async (file, label) => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'degree_applications',
        upload_preset: process.env.CLOUDNINARY_UNSIGNED_UPLOAD_PRESET,
        resource_type: 'auto'
      });
      fs.unlinkSync(file.path);
      resultUrls[label] = result.secure_url;
    } catch (err) {
      console.error(`Failed to upload ${label}:`, err.message);
      throw new Error(`Upload failed for ${label}`);
    }
  };

  try {
    // Upload each file (skip if undefined)
    await Promise.all([ 
      files?.final_transcript?.[0] && uploadToCloudinary(files.final_transcript[0], 'finalTranscriptUrl'),
      files?.cnic_copy?.[0] && uploadToCloudinary(files.cnic_copy[0], 'cnicUrl'),
      files?.library_clearance?.[0] && uploadToCloudinary(files.library_clearance[0], 'libraryClearanceUrl'),
      files?.accounts_clearance?.[0] && uploadToCloudinary(files.accounts_clearance[0], 'accountsClearanceUrl'),
      files?.degree_fee_receipt?.[0] && uploadToCloudinary(files.degree_fee_receipt[0], 'bankReceiptUrl')
    ]);

    const user = req.session.user;
    if (!user || !user.student || !user.student.cnic_number) {
      return res.status(401).json({ success: false, message: "User session invalid or expired." });
    }

    // Update student's uploadedDocs + submittedAt + status
    const update = {
      $set: {
        'application.uploadedDocs': {
          finalTranscriptUrl: resultUrls.finalTranscriptUrl || null,
          cnicUrl: resultUrls.cnicUrl || null,
          libraryClearanceUrl: resultUrls.libraryClearanceUrl || null,
          accountsClearanceUrl: resultUrls.accountsClearanceUrl || null,
          bankReceiptUrl: resultUrls.bankReceiptUrl || null
        },
        'application.submittedAt': new Date(),
        'application.status': 'Pending',
        'application.id': user.student.cnic_number
      }
    };

    const updateResult = await db.collection('students').updateOne(
      { cnic_number: user.student.cnic_number },
      update
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({ success: false, message: "Student not found or nothing updated." });
    }
    const student = await db.collection('students').findOne({ cnic_number: user.student.cnic_number });
    const allStudents = await db.collection('students').find().toArray();
    io.emit('new-application', {msg: allStudents});
    res.json({ success: true, urls: resultUrls , student: student});   

  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});




app.patch('/update-profile', async (req, res) => {
  const { username, key, value } = req.body;
  
    console.log("Sending student data:", req.body);
// Input validation with specific reasons
  if (!username) {
    return res.status(400).json({ success: false, message: "Username is required" });
  }
  if (!key) {
    return res.status(400).json({ success: false, message: "Field key is required" });
  }
  if (typeof value !== 'string') {
    return res.status(400).json({ success: false, message: "Value must be a string" });
  }
  

  try {
    const update = { $set: { [key]: value } };
    const result = await db.collection('fyp_collection').updateOne({ username }, update);

    if (result.modifiedCount === 1) {
      res.json({ success: true, message: "Field updated successfully" });
    } else {
      res.status(404).json({ success: false, message: "User not found or no change" });
    }
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});



app.get('/records', async (req, res) => {
  try {
    const users = await db.collection('fyp_collection').find().toArray();
    res.json(users);
  } catch (err) {
    console.error("Fetch records error:", err);
    res.status(500).json({ success: false, message: "Error fetching records" });
  }
});


app.post('/add-record', async (req, res) => {
  const { username, roll_no, student_name, department, program } = req.body;

  if (!username) return res.status(400).json({ success: false, message: "Username required" });

  try {
    const existing = await db.collection('fyp_collection').findOne({ username });
    if (existing) return res.status(400).json({ success: false, message: "Username already exists" });

    await db.collection('fyp_collection').insertOne({
      username,
      roll_no,
      student_name,
      department,
      program,
      password: "default123" // default password or prompt later
    });

    res.json({ success: true, message: "Record added" });
  } catch (err) {
    console.error("Add record error:", err);
    res.status(500).json({ success: false, message: "Error adding record" });
  }
});


// Start the server on a specified port (default to 3000)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});


import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';  // Ensure this line is included
 // If using ffmpeg-static

const app = express();

// Apply CORS middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:5173"],
    credentials: true,
  })
);

// Set headers for CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// Middleware to parse incoming JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));  // Serve static files from "uploads" directory

// Multer middleware configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");  // Save the uploaded files in the "uploads" directory
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + uuidv4() + path.extname(file.originalname));  // Generate a unique filename
  },
});

const upload = multer({ storage: storage });

// Define a sample route
app.get("/", function (req, res) {
  res.json({ message: "Hello from Avi!" });
});

// Handle file uploads and process video to HLS format
app.post("/upload", upload.single('file'), function (req, res) {
    console.log("File uploaded!!");
  
    const lessonId = uuidv4();
    const videoPath = req.file.path;  // Path of the uploaded video file
    const outputPath = `./uploads/courses/${lessonId}`;  // Directory to store the processed video
    const hlsPath = `${outputPath}/index.m3u8`;  // Path of the generated HLS playlist file
    console.log("Video Path:", videoPath); // Log the video path
    console.log("HLS Path:", hlsPath);
  
    // Create the directory if it doesn't exist
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
      console.log("Output Path Created:", outputPath); // Log the output path creation
    }
  
    // Set FFmpeg binary path
    ffmpeg.setFfmpegPath(ffmpegStatic);  // Ensure ffmpeg-static is imported
  
    // Process the video using fluent-ffmpeg
    ffmpeg(videoPath)
  .outputOptions([
    '-codec:v libx264',
    '-codec:a aac',
    '-hls_time 10',
    `-hls_segment_filename "${outputPath}/segment%03d.ts"`,
  ])
  .output(hlsPath)
  .on('start', commandLine => console.log('Spawned FFmpeg with command: ' + commandLine))
  .on('progress', progress => console.log('Processing: ' + progress.percent + '% done'))
  .on('stderr', (stderrLine) => {
    console.log('FFmpeg stderr: ' + stderrLine);
  })
  .on('error', (err) => {
    console.error('An error occurred:', err.message);
    res.status(500).json({ error: "Failed to process video", details: err.message });
  })
  .on('end', () => {
    console.log('Processing finished successfully!');
    // Handle the response as before
  })
  .run();

  });
  
// Start the server on port 3000
app.listen(3000, function () {
  console.log("App is listening at port 3000...");
});

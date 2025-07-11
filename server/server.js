const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Database = require('./database');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

// Handle ffprobe-static import more carefully
let ffprobeStatic;
try {
  ffprobeStatic = require('ffprobe-static');
  console.log('ffprobe-static loaded successfully');
} catch (error) {
  console.error('Error loading ffprobe-static:', error);
  ffprobeStatic = null;
}
const sharp = require('sharp');
const Jimp = require('jimp');

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize database
const db = new Database();

// Set ffmpeg paths
console.log('FFmpeg static path:', ffmpegStatic);
console.log('FFprobe static path:', ffprobeStatic);
console.log('FFprobe static type:', typeof ffprobeStatic);

// Handle ffprobe path - sometimes it returns an object
let ffprobePath;
if (!ffprobeStatic) {
  console.warn('ffprobe-static not available, using system ffprobe');
  ffprobePath = 'ffprobe';
} else if (typeof ffprobeStatic === 'string') {
  ffprobePath = ffprobeStatic;
} else if (ffprobeStatic && typeof ffprobeStatic === 'object') {
  // Check common properties for the path
  if (ffprobeStatic.path) {
    ffprobePath = ffprobeStatic.path;
  } else if (ffprobeStatic.default) {
    ffprobePath = ffprobeStatic.default;
  } else if (typeof ffprobeStatic.toString === 'function') {
    ffprobePath = ffprobeStatic.toString();
  } else {
    console.warn('ffprobe-static object has unexpected structure:', Object.keys(ffprobeStatic));
    ffprobePath = 'ffprobe'; // Use system ffprobe as fallback
  }
} else {
  console.warn('ffprobe-static has unexpected type:', typeof ffprobeStatic);
  ffprobePath = 'ffprobe'; // Use system ffprobe as fallback
}

console.log('Resolved FFprobe path:', ffprobePath);

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobePath);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from output directory
app.use('/files', express.static(outputDir));

// Serve frames and other output files
app.use('/output', express.static(outputDir));

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Video Convert API is running' });
});

// Test FFmpeg installation
app.get('/api/test-ffmpeg', (req, res) => {
  try {
    console.log('Testing FFmpeg installation...');
    console.log('FFmpeg path:', ffmpegStatic);
    console.log('FFprobe path (raw):', ffprobeStatic);
    console.log('FFprobe path (resolved):', ffprobePath);
    
    // Test if ffmpeg binary exists
    const ffmpegExists = fs.existsSync(ffmpegStatic);
    const ffprobeExists = fs.existsSync(ffprobePath);
    
    console.log('FFmpeg binary found:', ffmpegExists);
    console.log('FFprobe binary found:', ffprobeExists);
    
    res.json({
      message: 'FFmpeg test completed',
      ffmpegPath: ffmpegStatic,
      ffprobePathRaw: ffprobeStatic,
      ffprobePathResolved: ffprobePath,
      ffmpegExists: ffmpegExists,
      ffprobeExists: ffprobeExists,
      ffprobeType: typeof ffprobeStatic
    });
  } catch (error) {
    console.error('FFmpeg test error:', error);
    res.status(500).json({ error: 'FFmpeg test failed: ' + error.message });
  }
});

// Video metadata extraction
app.post('/api/video/metadata', upload.single('video'), async (req, res) => {
  console.log('Received metadata request:', req.file ? req.file.originalname : 'No file');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const videoPath = req.file.path;
  console.log('Processing video at:', videoPath);
  
  let videoHistoryId;
  
  try {
    // Add to database
    videoHistoryId = await db.addVideoRecord({
      filename: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      operationType: 'metadata_extraction',
      status: 'processing',
      inputPath: videoPath
    });
  } catch (dbErr) {
    console.error('Database error:', dbErr);
  }
  
  // Use the corrected ffprobe method
  ffmpeg.ffprobe(videoPath, async (err, metadata) => {
    if (err) {
      console.error('FFprobe error:', err);
      console.error('FFprobe error details:', err.message);
      
      // Update database with error
      if (videoHistoryId) {
        try {
          await db.updateVideoRecord(videoHistoryId, {
            status: 'failed',
            errorMessage: err.message
          });
        } catch (dbErr) {
          console.error('Database update error:', dbErr);
        }
      }
      
      // Clean up uploaded file on error
      try {
        fs.unlinkSync(videoPath);
      } catch (cleanupErr) {
        console.error('Error cleaning up file after error:', cleanupErr);
      }
      
      return res.status(500).json({ 
        error: 'Error extracting metadata: ' + err.message,
        details: err.toString()
      });
    }

    // Update database with success
    if (videoHistoryId) {
      try {
        await db.updateVideoRecord(videoHistoryId, {
          status: 'completed',
          additionalData: { metadataExtracted: true, duration: metadata.format.duration }
        });
      } catch (dbErr) {
        console.error('Database update error:', dbErr);
      }
    }

    // Clean up uploaded file
    try {
      fs.unlinkSync(videoPath);
      console.log('Cleaned up uploaded file:', videoPath);
    } catch (cleanupErr) {
      console.error('Error cleaning up file:', cleanupErr);
    }

    console.log('Metadata extracted successfully for:', req.file.originalname);
    res.json({
      id: videoHistoryId,
      filename: req.file.originalname,
      metadata: metadata
    });
  });
});

// Save metadata to JSON file
app.post('/api/video/save-metadata', async (req, res) => {
  const { filename, metadata, id } = req.body;
  
  if (!filename || !metadata) {
    return res.status(400).json({ error: 'Filename and metadata are required' });
  }

  const jsonFilename = `${filename}_metadata.json`;
  const jsonPath = path.join(outputDir, jsonFilename);
  
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(metadata, null, 2));
    
    // Update database if ID provided
    if (id) {
      try {
        await db.updateVideoRecord(id, {
          metadataPath: jsonPath,
          additionalData: { metadataSaved: true, jsonFilename: jsonFilename }
        });
      } catch (dbErr) {
        console.error('Database update error:', dbErr);
      }
    }
    
    const fileUrl = `http://localhost:${PORT}/files/${jsonFilename}`;
    
    res.json({ 
      message: 'Metadata saved successfully',
      filename: jsonFilename,
      path: jsonPath,
      downloadUrl: fileUrl,
      viewUrl: fileUrl
    });
  } catch (error) {
    console.error('Error saving metadata:', error);
    res.status(500).json({ error: 'Failed to save metadata file' });
  }
});

// Extract frames from video
app.post('/api/video/extract-frames', upload.single('video'), async (req, res) => {
  console.log('Received frame extraction request:', req.file ? req.file.originalname : 'No file');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const videoPath = req.file.path;
  const { preserveMetadata = false, frameCount, extractionMode = 'count' } = req.body;
  const framesDir = path.join(outputDir, `frames_${Date.now()}`);
  const framesDirName = path.basename(framesDir);
  
  console.log('Processing video at:', videoPath);
  console.log('Output directory:', framesDir);
  
  let videoHistoryId;
  
  try {
    if (!fs.existsSync(framesDir)) {
      fs.mkdirSync(framesDir, { recursive: true });
      console.log('Created frames directory:', framesDir);
    }

    // First, get video duration to calculate frame extraction
    ffmpeg.ffprobe(videoPath, async (err, metadata) => {
      if (err) {
        console.error('FFprobe error during frame extraction:', err);
        
        // Update database with error
        if (videoHistoryId) {
          try {
            await db.updateVideoRecord(videoHistoryId, {
              status: 'failed',
              errorMessage: err.message
            });
          } catch (dbErr) {
            console.error('Database update error:', dbErr);
          }
        }
        
        return res.status(500).json({ error: 'Error reading video metadata: ' + err.message });
      }

      const duration = metadata.format.duration;
      const fps = metadata.streams[0].r_frame_rate ? eval(metadata.streams[0].r_frame_rate) : 30;
      const totalFrames = Math.floor(duration * fps);
      
      console.log('Video duration:', duration, 'seconds');
      console.log('Video FPS:', fps);
      console.log('Total frames in video:', totalFrames);

      // Add to database now that we have metadata
      try {
        videoHistoryId = await db.addVideoRecord({
          filename: req.file.filename,
          originalName: req.file.originalname,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          operationType: 'frame_extraction',
          status: 'processing',
          inputPath: videoPath,
          additionalData: { 
            preserveMetadata, 
            framesDirName, 
            extractionMode, 
            requestedFrameCount: frameCount,
            totalVideoFrames: totalFrames,
            videoFPS: fps,
            duration: duration
          }
        });
      } catch (dbErr) {
        console.error('Database error:', dbErr);
      }

      let actualFrameCount;
      let timestamps = [];

      if (extractionMode === 'all') {
        // Extract every frame (WARNING: This can be very large!)
        actualFrameCount = totalFrames;
        console.log('Extracting ALL frames - this may take a while and use lots of disk space!');
      } else if (extractionMode === 'count' && frameCount) {
        // Extract specific number of frames
        actualFrameCount = Math.min(parseInt(frameCount), totalFrames);
        for (let i = 0; i < actualFrameCount; i++) {
          const timestamp = (duration / (actualFrameCount + 1)) * (i + 1);
          timestamps.push(timestamp);
        }
      } else {
        // Default: extract frames every second
        actualFrameCount = Math.min(Math.floor(duration), totalFrames);
        for (let i = 0; i < actualFrameCount; i++) {
          timestamps.push(i + 1); // Every second
        }
      }
      
      console.log('Extracting', actualFrameCount, 'frames');
      if (timestamps.length > 0) {
        console.log('Sample timestamps:', timestamps.slice(0, 5));
      }

      let ffmpegCommand;
      
      if (extractionMode === 'all') {
        // Extract every frame using a different approach
        ffmpegCommand = ffmpeg(videoPath)
          .output(path.join(framesDir, 'frame_%06d.png'))
          .outputOptions([
            '-vf', 'scale=-1:720', // Auto-width, 720p height
            '-q:v', '2' // High quality
          ]);
      } else {
        // Extract specific frames at timestamps
        ffmpegCommand = ffmpeg(videoPath)
          .screenshots({
            timestamps: timestamps,
            filename: 'frame_%06d.png',
            folder: framesDir,
            size: '?x720' // Auto-width, 720p height
          });
      }
      
      ffmpegCommand
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('Frame extraction progress:', progress.percent + '% done');
        })
        .on('end', async () => {
          console.log('Frame extraction completed');
          
          // Clean up uploaded file
          try {
            fs.unlinkSync(videoPath);
            console.log('Cleaned up uploaded file:', videoPath);
          } catch (cleanupErr) {
            console.error('Error cleaning up file:', cleanupErr);
          }
          
          // Count extracted frames and add to database
          const files = fs.readdirSync(framesDir);
          console.log('Extracted frames:', files.length);
          
          // Add frame records to database
          if (videoHistoryId) {
            try {
              for (let i = 0; i < files.length; i++) {
                const frameFile = files[i];
                const framePath = path.join(framesDir, frameFile);
                const frameNumber = i + 1;
                const timestamp = timestamps[i] || 0;
                
                await db.addExtractedFrame(videoHistoryId, framePath, frameNumber, timestamp);
              }
              
              // Update video record
              await db.updateVideoRecord(videoHistoryId, {
                status: 'completed',
                outputPath: framesDir,
                additionalData: { 
                  preserveMetadata, 
                  framesDirName, 
                  frameCount: files.length,
                  duration: duration
                }
              });
            } catch (dbErr) {
              console.error('Database update error:', dbErr);
            }
          }
          
          // Create frame URLs
          const frameUrls = files.map(file => `http://localhost:${PORT}/files/${framesDirName}/${file}`);
          const browseUrl = `http://localhost:${PORT}/browse/${framesDirName}`;
          
          res.json({
            id: videoHistoryId,
            message: `${files.length} frames extracted successfully`,
            outputDir: framesDir,
            frameCount: files.length,
            preserveMetadata: preserveMetadata,
            frameUrls: frameUrls,
            browseUrl: browseUrl,
            framesDirectory: framesDirName
          });
        })
        .on('error', async (err) => {
          console.error('FFmpeg error during frame extraction:', err);
          
          // Update database with error
          if (videoHistoryId) {
            try {
              await db.updateVideoRecord(videoHistoryId, {
                status: 'failed',
                errorMessage: err.message
              });
            } catch (dbErr) {
              console.error('Database update error:', dbErr);
            }
          }
          
          // Clean up on error
          try {
            fs.unlinkSync(videoPath);
          } catch (cleanupErr) {
            console.error('Error cleaning up file after error:', cleanupErr);
          }
          
          res.status(500).json({ 
            error: 'Error extracting frames: ' + err.message,
            details: err.toString()
          });
        });
      
      // Start the extraction
      if (extractionMode === 'all') {
        ffmpegCommand.run();
      }
    });

  } catch (error) {
    console.error('Unexpected error in frame extraction:', error);
    
    // Update database with error
    if (videoHistoryId) {
      try {
        await db.updateVideoRecord(videoHistoryId, {
          status: 'failed',
          errorMessage: error.message
        });
      } catch (dbErr) {
        console.error('Database update error:', dbErr);
      }
    }
    
    res.status(500).json({ error: 'Unexpected error: ' + error.message });
  }
});

// Trim video
app.post('/api/video/trim', upload.single('video'), (req, res) => {
  console.log('Received trim request:', req.file ? req.file.originalname : 'No file');
  
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }

  const videoPath = req.file.path;
  const { startTime, endTime, preserveMetadata = false } = req.body;
  
  console.log('Trim parameters:', { startTime, endTime, preserveMetadata });
  
  if (!startTime || !endTime) {
    return res.status(400).json({ error: 'Start time and end time are required' });
  }

  const start = parseFloat(startTime);
  const end = parseFloat(endTime);
  
  if (isNaN(start) || isNaN(end) || start >= end || start < 0) {
    return res.status(400).json({ error: 'Invalid time values' });
  }

  const outputFilename = `trimmed_${Date.now()}.mp4`;
  const outputPath = path.join(outputDir, outputFilename);
  
  console.log('Trimming video:', videoPath);
  console.log('Output path:', outputPath);
  console.log('Duration:', end - start, 'seconds');

  ffmpeg(videoPath)
    .setStartTime(start)
    .setDuration(end - start)
    .output(outputPath)
    .videoCodec('libx264')
    .audioCodec('aac')
    .on('start', (commandLine) => {
      console.log('FFmpeg trim command:', commandLine);
    })
    .on('progress', (progress) => {
      console.log('Trim progress:', progress.percent + '% done');
    })
    .on('end', () => {
      console.log('Video trimming completed');
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(videoPath);
        console.log('Cleaned up uploaded file:', videoPath);
      } catch (cleanupErr) {
        console.error('Error cleaning up file:', cleanupErr);
      }
      
      // Check if output file exists
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log('Output file size:', stats.size, 'bytes');
        
        res.json({
          message: 'Video trimmed successfully',
          outputPath: outputPath,
          filename: outputFilename,
          fileSize: stats.size,
          preserveMetadata: preserveMetadata
        });
      } else {
        res.status(500).json({ error: 'Output file was not created' });
      }
    })
    .on('error', (err) => {
      console.error('FFmpeg error during trimming:', err);
      
      // Clean up on error
      try {
        fs.unlinkSync(videoPath);
      } catch (cleanupErr) {
        console.error('Error cleaning up file after error:', cleanupErr);
      }
      
      res.status(500).json({ 
        error: 'Error trimming video: ' + err.message,
        details: err.toString()
      });
    })
    .run();
});

// Process 360 image
app.post('/api/360image/process', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }

  const imagePath = req.file.path;
  const { action, preserveMetadata = false } = req.body;
  
  // For now, just return the uploaded image info
  res.json({
    message: '360 image processed successfully',
    filename: req.file.originalname,
    action: action,
    preserveMetadata: preserveMetadata
  });
  
  // Clean up uploaded file
  fs.unlinkSync(imagePath);
});

// Convert 360 images to cube map
app.post('/api/360image/cube-map', upload.array('images'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No images uploaded' });
  }

  const cubeMapDir = path.join(outputDir, `cubemap_${Date.now()}`);
  if (!fs.existsSync(cubeMapDir)) {
    fs.mkdirSync(cubeMapDir, { recursive: true });
  }

  try {
    const results = [];
    
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const imagePath = file.path;
      
      // Process each 360 image into 6 cube faces
      // This is a simplified version - actual cube map conversion would be more complex
      const image = await Jimp.read(imagePath);
      const width = image.bitmap.width;
      const height = image.bitmap.height;
      const faceSize = Math.min(width, height) / 4;
      
      const faces = ['front', 'back', 'left', 'right', 'top', 'bottom'];
      
      for (let j = 0; j < faces.length; j++) {
        const face = faces[j];
        const faceImage = image.clone().crop(
          j * faceSize, 0, faceSize, faceSize
        );
        
        const faceFilename = `${path.parse(file.originalname).name}_${face}.png`;
        const facePath = path.join(cubeMapDir, faceFilename);
        
        await faceImage.writeAsync(facePath);
      }
      
      const faceUrls = faces.map(face => {
        const filename = `${path.parse(file.originalname).name}_${face}.png`;
        return {
          face: face,
          filename: filename,
          url: `http://localhost:${PORT}/files/${path.basename(cubeMapDir)}/${filename}`
        };
      });

      results.push({
        original: file.originalname,
        faces: faces.map(face => `${path.parse(file.originalname).name}_${face}.png`),
        faceUrls: faceUrls
      });
      
      // Clean up uploaded file
      fs.unlinkSync(imagePath);
    }
    
    const cubeMapDirName = path.basename(cubeMapDir);
    const browseUrl = `http://localhost:${PORT}/browse/${cubeMapDirName}`;
    
    res.json({
      message: 'Cube maps generated successfully',
      outputDir: cubeMapDir,
      results: results,
      browseUrl: browseUrl,
      cubeMapDirectory: cubeMapDirName
    });
    
  } catch (error) {
    console.error('Error generating cube maps:', error);
    res.status(500).json({ error: 'Error generating cube maps' });
  }
});

// Get all video processing history
app.get('/api/history', async (req, res) => {
  try {
    const history = await db.getAllVideoHistory();
    res.json(history);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// Get specific video details
app.get('/api/history/:id', async (req, res) => {
  try {
    const video = await db.getVideoById(req.params.id);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    // Get frames if it's a frame extraction
    if (video.operation_type === 'frame_extraction') {
      const frames = await db.getFramesForVideo(video.id);
      video.frames = frames;
    }
    
    res.json(video);
  } catch (error) {
    console.error('Error fetching video details:', error);
    res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

// Get frames for a specific video
app.get('/api/history/:id/frames', async (req, res) => {
  try {
    const frames = await db.getFramesForVideo(req.params.id);
    
    // Add URLs to frames
    const framesWithUrls = frames.map(frame => {
      const fileName = path.basename(frame.frame_path);
      const dirName = path.basename(path.dirname(frame.frame_path));
      return {
        ...frame,
        url: `http://localhost:${PORT}/files/${dirName}/${fileName}`,
        fileName: fileName
      };
    });
    
    res.json(framesWithUrls);
  } catch (error) {
    console.error('Error fetching frames:', error);
    res.status(500).json({ error: 'Failed to fetch frames' });
  }
});

// Browse files in output directory (HTML interface)
app.get('/browse/:directory?', (req, res) => {
  try {
    const directory = req.params.directory || '';
    const fullPath = path.join(outputDir, directory);
    
    // Security check - don't allow going above output directory
    if (!fullPath.startsWith(outputDir)) {
      return res.status(403).send('<h1>Access Denied</h1>');
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('<h1>Directory Not Found</h1>');
    }
    
    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    const files = items.map(item => {
      const itemPath = path.join(directory, item.name);
      return {
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        path: itemPath,
        url: item.isFile() ? `http://localhost:${PORT}/files/${itemPath}` : null,
        size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : null
      };
    });
    
    // Generate HTML for file browser
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>File Browser - ${directory || 'Root'}</title>
    <style>
        body {
            font-family: 'Courier New', monospace;
            background-color: #1a1a1a;
            color: #00ff00;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: #00ff00;
            text-shadow: 0 0 10px #00ff00;
            text-align: center;
            margin-bottom: 30px;
        }
        .breadcrumb {
            background-color: #2a2a2a;
            padding: 10px 15px;
            border-radius: 5px;
            border: 2px solid #00ff00;
            margin-bottom: 20px;
            color: #00cc00;
        }
        .file-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
            margin-top: 20px;
        }
        .file-item {
            background-color: #2a2a2a;
            border: 2px solid #00ff00;
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            transition: all 0.3s ease;
            cursor: pointer;
        }
        .file-item:hover {
            background-color: #333;
            box-shadow: 0 0 15px rgba(0, 255, 0, 0.3);
            transform: translateY(-2px);
        }
        .file-item img {
            max-width: 100%;
            max-height: 150px;
            border-radius: 5px;
            border: 1px solid #555;
        }
        .file-name {
            margin-top: 10px;
            font-weight: bold;
            color: #00ff00;
            word-break: break-word;
        }
        .file-size {
            color: #888;
            font-size: 0.8rem;
            margin-top: 5px;
        }
        .directory-icon {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        .image-icon {
            font-size: 3rem;
            margin-bottom: 10px;
        }
        a {
            text-decoration: none;
            color: inherit;
        }
        .back-link {
            display: inline-block;
            background-color: #00ff00;
            color: #000;
            padding: 10px 20px;
            border-radius: 5px;
            margin-bottom: 20px;
            font-weight: bold;
        }
        .back-link:hover {
            background-color: #00cc00;
        }
        .stats {
            text-align: center;
            color: #00cc00;
            margin-top: 30px;
            padding: 15px;
            background-color: #333;
            border-radius: 5px;
            border: 2px solid #00ff00;
        }
    </style>
</head>
<body>
    <h1>📁 File Browser</h1>
    
    <div class="breadcrumb">
        📂 Current Directory: /${directory || 'root'}
    </div>
    
    ${directory ? `<a href="/browse" class="back-link">← Back to Root</a>` : ''}
    
    <div class="file-grid">
        ${files.map(file => {
          if (file.type === 'directory') {
            return `
              <a href="/browse/${file.path}">
                <div class="file-item">
                  <div class="directory-icon">📁</div>
                  <div class="file-name">${file.name}</div>
                  <div class="file-size">Directory</div>
                </div>
              </a>
            `;
          } else {
            const isImage = file.name.toLowerCase().match(/\.(png|jpg|jpeg|gif|bmp|webp)$/);
            return `
              <a href="${file.url}" target="_blank">
                <div class="file-item">
                  ${isImage ? 
                    `<img src="${file.url}" alt="${file.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                     <div class="image-icon" style="display:none;">🖼️</div>` :
                    `<div class="image-icon">📄</div>`
                  }
                  <div class="file-name">${file.name}</div>
                  <div class="file-size">${file.size ? formatBytes(file.size) : 'Unknown'}</div>
                </div>
              </a>
            `;
          }
        }).join('')}
    </div>
    
    <div class="stats">
        📊 ${files.filter(f => f.type === 'directory').length} directories • 
        ${files.filter(f => f.type === 'file').length} files
    </div>
    
    <script>
        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // Add formatted file sizes
        document.querySelectorAll('.file-size').forEach(el => {
            const text = el.textContent;
            const bytes = parseInt(text);
            if (!isNaN(bytes)) {
                el.textContent = formatBytes(bytes);
            }
        });
    </script>
</body>
</html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error browsing directory:', error);
    res.status(500).send('<h1>Error</h1><p>Failed to browse directory</p>');
  }
});

// Browse files in output directory (JSON API)
app.get('/api/browse/:directory?', (req, res) => {
  try {
    const directory = req.params.directory || '';
    const fullPath = path.join(outputDir, directory);
    
    // Security check - don't allow going above output directory
    if (!fullPath.startsWith(outputDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    const files = items.map(item => {
      const itemPath = path.join(directory, item.name);
      return {
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file',
        path: itemPath,
        url: item.isFile() ? `http://localhost:${PORT}/files/${itemPath}` : null,
        size: item.isFile() ? fs.statSync(path.join(fullPath, item.name)).size : null
      };
    });
    
    res.json({
      directory: directory,
      parent: directory ? path.dirname(directory) : null,
      items: files
    });
  } catch (error) {
    console.error('Error browsing directory:', error);
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

// Settings API endpoints

// Get all settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Get specific setting
app.get('/api/settings/:key', async (req, res) => {
  try {
    const value = await db.getSetting(req.params.key);
    if (value === null) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    res.json({ key: req.params.key, value: value });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// Update settings
app.put('/api/settings', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings data' });
    }
    
    await db.setMultipleSettings(settings);
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Update single setting
app.put('/api/settings/:key', async (req, res) => {
  try {
    const { value } = req.body;
    
    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }
    
    await db.setSetting(req.params.key, value);
    res.json({ message: 'Setting updated successfully' });
  } catch (error) {
    console.error('Error updating setting:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('Server startup error:', err);
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Try a different port.`);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
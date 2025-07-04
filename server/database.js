const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    const dbPath = path.join(__dirname, 'videoconvert.db');
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  initializeTables() {
    // Video processing history table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS video_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_size INTEGER,
        mime_type TEXT,
        operation_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processing',
        input_path TEXT,
        output_path TEXT,
        metadata_path TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        error_message TEXT,
        additional_data TEXT
      )
    `, (err) => {
      if (err) {
        console.error('Error creating video_history table:', err);
      } else {
        console.log('Video history table ready');
      }
    });

    // Extracted frames table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS extracted_frames (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_history_id INTEGER,
        frame_path TEXT NOT NULL,
        frame_number INTEGER,
        timestamp REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (video_history_id) REFERENCES video_history (id)
      )
    `, (err) => {
      if (err) {
        console.error('Error creating extracted_frames table:', err);
      } else {
        console.log('Extracted frames table ready');
      }
    });
  }

  // Add a new video processing record
  addVideoRecord(data) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO video_history 
        (filename, original_name, file_size, mime_type, operation_type, status, input_path, additional_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [
        data.filename,
        data.originalName,
        data.fileSize,
        data.mimeType,
        data.operationType,
        data.status || 'processing',
        data.inputPath,
        JSON.stringify(data.additionalData || {})
      ], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Update video record with completion data
  updateVideoRecord(id, data) {
    return new Promise((resolve, reject) => {
      const fields = [];
      const values = [];
      
      if (data.status) {
        fields.push('status = ?');
        values.push(data.status);
      }
      
      if (data.outputPath) {
        fields.push('output_path = ?');
        values.push(data.outputPath);
      }
      
      if (data.metadataPath) {
        fields.push('metadata_path = ?');
        values.push(data.metadataPath);
      }
      
      if (data.errorMessage) {
        fields.push('error_message = ?');
        values.push(data.errorMessage);
      }
      
      if (data.status === 'completed') {
        fields.push('completed_at = CURRENT_TIMESTAMP');
      }
      
      if (data.additionalData) {
        fields.push('additional_data = ?');
        values.push(JSON.stringify(data.additionalData));
      }
      
      values.push(id);
      
      const sql = `UPDATE video_history SET ${fields.join(', ')} WHERE id = ?`;
      
      this.db.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  // Add extracted frame record
  addExtractedFrame(videoHistoryId, framePath, frameNumber, timestamp) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO extracted_frames 
        (video_history_id, frame_path, frame_number, timestamp)
        VALUES (?, ?, ?, ?)
      `;
      
      this.db.run(sql, [videoHistoryId, framePath, frameNumber, timestamp], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  // Get all video history records
  getAllVideoHistory() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          vh.*,
          COUNT(ef.id) as frame_count
        FROM video_history vh
        LEFT JOIN extracted_frames ef ON vh.id = ef.video_history_id
        GROUP BY vh.id
        ORDER BY vh.created_at DESC
      `;
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse additional_data JSON
          const processedRows = rows.map(row => ({
            ...row,
            additional_data: row.additional_data ? JSON.parse(row.additional_data) : {}
          }));
          resolve(processedRows);
        }
      });
    });
  }

  // Get frames for a specific video
  getFramesForVideo(videoHistoryId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM extracted_frames 
        WHERE video_history_id = ? 
        ORDER BY frame_number
      `;
      
      this.db.all(sql, [videoHistoryId], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get video by ID
  getVideoById(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM video_history WHERE id = ?`;
      
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (row) {
          row.additional_data = row.additional_data ? JSON.parse(row.additional_data) : {};
          resolve(row);
        } else {
          resolve(null);
        }
      });
    });
  }

  // Close database connection
  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
        resolve();
      });
    });
  }
}

module.exports = Database;
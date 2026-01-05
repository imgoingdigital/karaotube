import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { getConfig } from './config-manager';

const execFileAsync = promisify(execFile);

const YT_DLP_PATH = path.join(process.cwd(), 'app', 'bin', 'yt-dlp.exe');
const FFMPEG_PATH = path.join(process.cwd(), 'app', 'bin', 'ffmpeg.exe');
const LIBRARY_BASE = path.join(process.cwd(), 'library');
const METADATA_FILE = path.join(LIBRARY_BASE, 'metadata.json');

interface VideoMetadata {
  videoId: string;
  title: string;
  location: 'temp' | 'saved';
  filePath: string;
  playCount: number;
  addedAt: number;
  lastPlayed?: number;
  fileSize: number;
  isSaved: boolean;
}

class LGVideoLibrary {
  private metadata: Map<string, VideoMetadata> = new Map();
  private tempPath: string;
  private savedPath: string;
  private autoSaveThreshold: number;
  private maxTempVideos: number;

  constructor() {
    const config = getConfig();
    this.tempPath = path.join(process.cwd(), config.library?.tempPath || 'library/youtube');
    this.savedPath = path.join(process.cwd(), config.library?.savedPath || 'library/youtube/saved');
    this.autoSaveThreshold = config.library?.autoSaveThreshold || 5;
    this.maxTempVideos = config.library?.maxTempVideos || 3;
    
    this.ensureLibraryDirs();
    this.loadMetadata();
    this.validateFiles();
  }

  private ensureLibraryDirs() {
    [LIBRARY_BASE, this.tempPath, this.savedPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  private loadMetadata() {
    if (fs.existsSync(METADATA_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
        this.metadata = new Map(Object.entries(data));
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    }
  }

  private saveMetadata() {
    const data = Object.fromEntries(this.metadata);
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
  }

  private validateFiles() {
    // Check if files still exist, remove metadata for missing files
    let changed = false;
    for (const [videoId, meta] of this.metadata.entries()) {
      if (meta.filePath && !fs.existsSync(meta.filePath)) {
        console.log(`File missing for ${videoId}, will be redownloaded if needed`);
        meta.filePath = '';
        changed = true;
      }
    }
    if (changed) this.saveMetadata();
  }

  hasVideo(videoId: string): boolean {
    const meta = this.metadata.get(videoId);
    if (!meta || !meta.filePath) return false;
    return fs.existsSync(meta.filePath);
  }

  getVideoInfo(videoId: string): VideoMetadata | null {
    return this.metadata.get(videoId) || null;
  }

  getVideoPath(videoId: string): string | null {
    if (!this.hasVideo(videoId)) return null;
    return this.metadata.get(videoId)!.filePath;
  }

  async downloadAndEncode(videoId: string, title: string): Promise<string> {
    // Check if we already have metadata (file was deleted)
    let meta = this.metadata.get(videoId);
    const location: 'temp' | 'saved' = meta?.isSaved ? 'saved' : 'temp';
    
    const targetDir = location === 'saved' ? this.savedPath : this.tempPath;
    const fileName = `${videoId}.mp4`;
    const filePath = path.join(targetDir, fileName);

    console.log(`Downloading video for LG: ${videoId} to ${location}`);

    // Download with yt-dlp in web-compatible format
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    
    await execFileAsync(YT_DLP_PATH, [
      '--format', 'bestvideo[ext=mp4][height<=1080]+bestaudio[ext=m4a]/best[ext=mp4][height<=1080]/best',
      '--merge-output-format', 'mp4',
      '--output', filePath,
      url
    ]);

    console.log(`Download complete, applying faststart for streaming...`);

    // Apply faststart for progressive streaming
    const tempPath = path.join(targetDir, `${videoId}_temp.mp4`);
    await execFileAsync(FFMPEG_PATH, [
      '-i', filePath,
      '-c', 'copy',
      '-movflags', '+faststart',
      tempPath
    ]);

    // Replace original with faststart version
    fs.unlinkSync(filePath);
    fs.renameSync(tempPath, filePath);

    // Save/update metadata
    const stats = fs.statSync(filePath);
    if (meta) {
      meta.filePath = filePath;
      meta.fileSize = stats.size;
    } else {
      this.metadata.set(videoId, {
        videoId,
        title,
        location,
        filePath,
        playCount: 0,
        addedAt: Date.now(),
        fileSize: stats.size,
        isSaved: location === 'saved'
      });
    }
    this.saveMetadata();

    // Clean up temp folder if needed
    if (location === 'temp') {
      await this.cleanupTempVideos();
    }

    console.log(`Video ready: ${videoId} (${(stats.size / 1024 / 1024).toFixed(2)} MB) [${location}]`);

    return filePath;
  }

  recordPlay(videoId: string) {
    const meta = this.metadata.get(videoId);
    if (!meta) return;

    meta.playCount++;
    meta.lastPlayed = Date.now();

    console.log(`Play recorded for ${videoId}: ${meta.playCount} plays`);

    // Auto-save if threshold reached
    if (!meta.isSaved && meta.playCount >= this.autoSaveThreshold) {
      console.log(`Auto-saving ${videoId} after ${meta.playCount} plays`);
      this.moveToSaved(videoId);
    } else {
      this.saveMetadata();
    }
  }

  moveToSaved(videoId: string): boolean {
    const meta = this.metadata.get(videoId);
    if (!meta) return false;
    if (meta.isSaved) return true; // Already saved

    const oldPath = meta.filePath;
    const fileName = `${videoId}.mp4`;
    const newPath = path.join(this.savedPath, fileName);

    try {
      if (fs.existsSync(oldPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Moved ${videoId} to saved folder`);
      } else {
        console.log(`File not found for ${videoId}, marking as unsaved`);
      }

      meta.location = 'saved';
      meta.filePath = newPath;
      meta.isSaved = true;
      this.saveMetadata();
      return true;
    } catch (err) {
      console.error(`Failed to move ${videoId} to saved:`, err);
      return false;
    }
  }

  private async cleanupTempVideos() {
    // Get all temp videos sorted by last played (oldest first)
    const tempVideos = Array.from(this.metadata.values())
      .filter(v => v.location === 'temp' && v.filePath && fs.existsSync(v.filePath))
      .sort((a, b) => (a.lastPlayed || a.addedAt) - (b.lastPlayed || b.addedAt));

    // Remove oldest if we exceed max
    while (tempVideos.length > this.maxTempVideos) {
      const oldest = tempVideos.shift()!;
      console.log(`Cleaning up old temp video: ${oldest.videoId} (${oldest.playCount} plays)`);
      
      try {
        fs.unlinkSync(oldest.filePath);
        oldest.filePath = '';
        this.saveMetadata();
      } catch (err) {
        console.error(`Failed to delete ${oldest.videoId}:`, err);
      }
    }
  }

  getStats() {
    const videos = Array.from(this.metadata.values());
    const saved = videos.filter(v => v.isSaved);
    const temp = videos.filter(v => !v.isSaved);
    const savedSize = saved.reduce((sum, v) => sum + v.fileSize, 0);
    const tempSize = temp.reduce((sum, v) => sum + v.fileSize, 0);
    
    return {
      total: videos.length,
      saved: saved.length,
      temp: temp.length,
      savedSizeMB: (savedSize / 1024 / 1024).toFixed(2),
      tempSizeMB: (tempSize / 1024 / 1024).toFixed(2),
      totalSizeMB: ((savedSize + tempSize) / 1024 / 1024).toFixed(2)
    };
  }

  getAllVideos() {
    return Array.from(this.metadata.values()).map(v => ({
      ...v,
      exists: v.filePath ? fs.existsSync(v.filePath) : false
    }));
  }
}

const globalForLibrary = global as unknown as { lgVideoLibrary: LGVideoLibrary };
export const lgVideoLibrary = globalForLibrary.lgVideoLibrary ?? new LGVideoLibrary();
if (process.env.NODE_ENV !== 'production') globalForLibrary.lgVideoLibrary = lgVideoLibrary;

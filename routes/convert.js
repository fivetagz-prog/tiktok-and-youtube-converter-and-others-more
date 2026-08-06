const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const COOKIES_PATH = path.join(__dirname, '../cookies.txt');

// Allowed platforms regex
const SUPPORTED_PLATFORMS = /youtube\.com|youtu\.be|tiktok\.com|instagram\.com|twitter\.com|x\.com|twitch\.tv|soundcloud\.com/;

router.get('/', (req, res) => {
    const mediaUrl = req.query.url;
    const format = (req.query.format || 'mp3').toLowerCase();

    if (!mediaUrl) {
        return res.status(400).json({ error: 'URL query parameter is required.' });
    }

    if (!SUPPORTED_PLATFORMS.test(mediaUrl)) {
        return res.status(400).json({ 
            error: 'Unsupported URL. Platform must be YouTube, TikTok, Instagram, Twitter/X, Twitch, or SoundCloud.' 
        });
    }

    // Set MIME types and extensions
    const mimeTypes = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        m4a: 'audio/mp4',
        mp4: 'video/mp4'
    };

    const mimeType = mimeTypes[format] || 'application/octet-stream';
    const filename = `media-${Date.now()}.${format}`;

    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.header('Content-Type', mimeType);

    const args = [];

    // Attach cookies file if available
    if (fs.existsSync(COOKIES_PATH)) {
        args.push('--cookies', COOKIES_PATH);
    }

    // Configure extraction flags based on chosen format
    if (format === 'mp3') {
        args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0');
    } else if (format === 'wav') {
        args.push('-x', '--audio-format', 'wav');
    } else if (format === 'm4a') {
        args.push('-x', '--audio-format', 'm4a');
    } else if (format === 'mp4') {
        args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best');
    } else {
        return res.status(400).json({ error: 'Invalid format requested.' });
    }

    args.push('-o', '-', mediaUrl);

    const ytdlp = spawn('yt-dlp', args);

    // Stream process directly to response
    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp error output: ${data.toString()}`);
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp process failed with exit code ${code}`);
        }
    });

    req.on('close', () => {
        ytdlp.kill();
    });
});

module.exports = router;

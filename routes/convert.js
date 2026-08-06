const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const COOKIES_PATH = path.join(__dirname, '../cookies.txt');
const TEMP_DIR = path.join(__dirname, '../temp');

// Ensure temporary download directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

router.get('/', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL is required.' });
    }

    const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
    const isTikTok = /tiktok\.com/.test(videoUrl);

    if (!isYouTube && !isTikTok) {
        return res.status(400).json({ error: 'Only YouTube and TikTok links are supported.' });
    }

    // TikTok Handler
    if (isTikTok) {
        try {
            const apiRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`);
            const data = await apiRes.json();

            if (data.code !== 0 || !data.data || !data.data.play) {
                return res.status(400).json({ error: data.msg || 'Failed to process TikTok video.' });
            }

            return res.redirect(data.data.play);
        } catch (err) {
            console.error('TikWM Error:', err);
            return res.status(500).json({ error: 'Failed to fetch TikTok MP4 video.' });
        }
    }

    // YouTube Handler (Temporary File Storage Fix)
    const outputFilename = `yt_${Date.now()}.mp4`;
    const outputPath = path.join(TEMP_DIR, outputFilename);

    const args = [];

    if (fs.existsSync(COOKIES_PATH)) {
        args.push('--cookies', COOKIES_PATH);
    }

    args.push(
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', outputPath,
        videoUrl
    );

    const ytdlp = spawn('yt-dlp', args);

    ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp: ${data.toString()}`);
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp failed with code ${code}`);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            return res.status(500).json({ error: 'Failed to process YouTube video.' });
        }

        // Send complete MP4 file to browser
        res.download(outputPath, 'video.mp4', (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            // Clean up temporary file from server
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        });
    });

    req.on('close', () => {
        if (!ytdlp.killed) {
            ytdlp.kill();
        }
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    });
});

module.exports = router;

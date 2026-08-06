const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const router = express.Router();
const COOKIES_PATH = path.join(__dirname, '../cookies.txt');
const TEMP_DIR = os.tmpdir();

router.get('/', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL query parameter is required.' });
    }

    const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
    const isTikTok = /tiktok\.com/.test(videoUrl);

    if (!isYouTube && !isTikTok) {
        return res.status(400).json({ error: 'Only YouTube and TikTok links are supported.' });
    }

    // TikTok Handler — API-based (No system binary required)
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
            return res.status(500).json({ error: 'Failed to fetch TikTok MP4 video stream.' });
        }
    }

    // YouTube Handler — Merges Audio + Video using yt-dlp & FFmpeg
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

    let ytdlp;
    try {
        ytdlp = spawn('yt-dlp', args);
    } catch (err) {
        console.error('yt-dlp spawn error:', err);
        return res.status(500).json({
            error: 'yt-dlp binary is not installed on this server environment. Deploy via Render/Docker to support YouTube processing.'
        });
    }

    ytdlp.on('error', (err) => {
        console.error('yt-dlp execution error:', err);
        if (!res.headersSent) {
            return res.status(500).json({
                error: 'yt-dlp binary is missing on Vercel Serverless Functions. Deploy using Render or Docker.'
            });
        }
    });

    ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp log: ${data.toString()}`);
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp process exited with code ${code}`);
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Failed to process YouTube video. Ensure yt-dlp and ffmpeg are installed on the server.' });
            }
            return;
        }

        if (!fs.existsSync(outputPath)) {
            if (!res.headersSent) {
                return res.status(500).json({ error: 'Output MP4 file was not generated.' });
            }
            return;
        }

        res.download(outputPath, 'video.mp4', (err) => {
            if (err) {
                console.error('Download transfer error:', err);
            }
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
        });
    });

    req.on('close', () => {
        if (ytdlp && !ytdlp.killed) {
            ytdlp.kill();
        }
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }
    });
});

module.exports = router;

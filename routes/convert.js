const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const COOKIES_PATH = path.join(__dirname, '../cookies.txt');

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

    // TikTok Handler — MP4 Video Only (TikWM API)
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

    // YouTube Handler — MP4 Video Only (yt-dlp)
    const filename = `youtube-${Date.now()}.mp4`;

    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.header('Content-Type', 'video/mp4');

    const args = [];

    if (fs.existsSync(COOKIES_PATH)) {
        args.push('--cookies', COOKIES_PATH);
    }

    args.push('-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best', '-o', '-', videoUrl);

    const ytdlp = spawn('yt-dlp', args);

    ytdlp.stdout.pipe(res);

    ytdlp.stderr.on('data', (data) => {
        console.error(`yt-dlp error: ${data.toString()}`);
    });

    ytdlp.on('close', (code) => {
        if (code !== 0) {
            console.error(`yt-dlp process exited with code ${code}`);
        }
    });

    req.on('close', () => {
        ytdlp.kill();
    });
});

module.exports = router;

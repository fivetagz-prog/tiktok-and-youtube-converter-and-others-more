const express = require('express');
const ytdl = require('@distube/ytdl-core');

const router = express.Router();

router.get('/', async (req, res) => {
    const videoUrl = req.query.url;

    if (!videoUrl) {
        return res.status(400).json({ error: 'URL parameter is required.' });
    }

    const isYouTube = /youtube\.com|youtu\.be/.test(videoUrl);
    const isTikTok = /tiktok\.com/.test(videoUrl);

    if (!isYouTube && !isTikTok) {
        return res.status(400).json({ error: 'Only YouTube and TikTok links are supported.' });
    }

    // 1. TikTok Handler (Pure API)
    if (isTikTok) {
        try {
            const apiRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`);
            const data = await apiRes.json();

            if (data.code !== 0 || !data.data || !data.data.play) {
                return res.status(400).json({ error: data.msg || 'Failed to process TikTok video.' });
            }

            return res.redirect(data.data.play);
        } catch (err) {
            console.error('TikTok API Error:', err);
            return res.status(500).json({ error: 'Failed to fetch TikTok MP4 video.' });
        }
    }

    // 2. YouTube Handler (Pure JS — No binaries or FFmpeg required)
    if (isYouTube) {
        try {
            // Extract formats directly using pure JS
            const info = await ytdl.getInfo(videoUrl);
            
            // Select progressive format (pre-combined audio + video MP4)
            const format = ytdl.chooseFormat(info.formats, {
                filter: 'audioandvideo',
                quality: 'highestvideo'
            });

            if (format && format.url) {
                return res.redirect(format.url);
            }
        } catch (err) {
            console.warn('ytdl-core failed, attempting API fallback:', err.message);
        }

        // Fallback API if ytdl-core encounters bot detection on Vercel IPs
        try {
            const fallbackRes = await fetch('https://api.cobalt.tools/api/json', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: JSON.stringify({
                    url: videoUrl,
                    vCodec: 'h264'
                })
            });

            const fallbackData = await fallbackRes.json();

            if (fallbackData && fallbackData.url) {
                return res.redirect(fallbackData.url);
            }

            return res.status(400).json({ error: fallbackData.text || 'Unable to extract video stream.' });
        } catch (fallbackErr) {
            console.error('Fallback API Error:', fallbackErr);
            return res.status(500).json({ error: 'Failed to process YouTube video on serverless environment.' });
        }
    }
});

module.exports = router;

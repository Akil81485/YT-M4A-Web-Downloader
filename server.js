const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const fs = require('fs');
const ytdlp = require('yt-dlp-exec');

const app = express();
app.use(cors());
app.use(express.json());

// Default download folder → Music
let DOWNLOAD_DIR = path.join(os.homedir(), 'Music');

// Helper: check duplicate
function isDuplicate(filePath) {
    return fs.existsSync(filePath);
}

// Download single video
async function downloadSingle(url) {
    const info = await ytdlp(url, { dumpSingleJson: true });
    const fileName = info.title.replace(/[\/\\?%*:|"<>]/g, '_') + '.m4a';
    const filePath = path.join(DOWNLOAD_DIR, fileName);

    if (isDuplicate(filePath)) {
        return { skipped: true, file: filePath, title: info.title };
    }

    await ytdlp(url, {
        extractAudio: true,
        audioFormat: 'm4a',
        output: path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s'),
    });

    return { skipped: false, file: filePath, title: info.title };
}

// Download playlist with per-video error handling
async function downloadPlaylist(url) {
    const info = await ytdlp(url, { dumpSingleJson: true });
    const entries = info.entries?.filter(v => v) || [];
    const results = [];

    for (const video of entries) {
        const title = video?.title || 'Unknown Title';

        try {
            if (video?.is_unavailable) {
                results.push({ skipped: true, title, reason: 'Unavailable' });
                continue;
            }

            const fileName = title.replace(/[\/\\?%*:|"<>]/g, '_') + '.m4a';
            const filePath = path.join(DOWNLOAD_DIR, fileName);

            if (isDuplicate(filePath)) {
                results.push({ skipped: true, title, reason: 'Duplicate', file: filePath });
                continue;
            }

            await ytdlp(video.webpage_url, {
                extractAudio: true,
                audioFormat: 'm4a',
                output: path.join(DOWNLOAD_DIR, '%(title)s.%(ext)s'),
                ignoreErrors: true, // continue even if this video fails
            });

            results.push({ skipped: false, title, file: filePath });
        } catch (err) {
            console.warn(`Failed to download "${title}": ${err.message}`);
            results.push({ skipped: true, title, reason: 'Unavailable/Blocked' });
        }
    }

    return results;
}

// Set custom download folder
app.post('/set-download-folder', (req, res) => {
    const folder = req.body.folder;
    if (!folder) return res.status(400).send('No folder provided');
    DOWNLOAD_DIR = folder;
    res.json({ success: true, folder: DOWNLOAD_DIR });
});

// Download endpoint
app.post('/download-audio', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).send('No URL provided');

    try {
        const info = await ytdlp(url, { dumpSingleJson: true });

        let results;
        if (info.entries && info.entries.length > 0) {
            // Playlist
            results = await downloadPlaylist(url);
        } else {
            // Single video
            results = [await downloadSingle(url)];
        }

        res.json({ success: true, results, downloadDir: DOWNLOAD_DIR });
    } catch (err) {
        console.error('Download failed:', err);
        res.status(500).send('Download failed');
    }
});

app.listen(5000, () => {
    console.log(`M4A Downloader running at http://localhost:5000`);
    console.log(`Files will be saved in: ${DOWNLOAD_DIR}`);
});

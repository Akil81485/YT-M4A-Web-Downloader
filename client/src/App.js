import { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = 'https://yt-m4a-web-downloader.onrender.com'; // Render backend URL

function App() {
  const [url, setUrl] = useState('');
  const [folder, setFolder] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Set custom download folder
  const setDownloadFolder = async () => {
    if (!folder) return alert('Enter folder path');
    try {
      await axios.post(`${BACKEND_URL}/set-download-folder`, { folder });
      setMessage(`✅ Download folder set to: ${folder}`);
    } catch (err) {
      setMessage('❌ Failed to set folder: ' + (err.response?.data || err.message));
    }
  };

  // Download single video or playlist
  const downloadAudio = async () => {
    if (!url) return alert('Enter URL');

    setLoading(true);
    setMessage('Starting download...');

    try {
      const res = await axios.post(`${BACKEND_URL}/download-audio`, { url });
      let msg = '';
      res.data.results.forEach((r) => {
        if (r.skipped) {
          msg += `⚠️ Skipped: ${r.title} (${r.reason || 'Duplicate'})\n`;
        } else {
          msg += `✅ Downloaded: ${r.title}\n`;
        }
      });
      msg += `\nFiles saved in: ${res.data.downloadDir}`;
      setMessage(msg);
    } catch (err) {
      setMessage('❌ Download failed: ' + (err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'Arial', maxWidth: '700px', margin: '50px auto', textAlign: 'center' }}>
      <h1>SnapTube Web – M4A Downloader</h1>

      <input
        type="text"
        placeholder="Enter video or playlist URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
      />

      <input
        type="text"
        placeholder="Custom download folder (default: Music folder)"
        value={folder}
        onChange={(e) => setFolder(e.target.value)}
        style={{ width: '100%', padding: '10px', margin: '10px 0' }}
      />

      <button onClick={setDownloadFolder} style={{ marginBottom: '20px', padding: '10px 20px' }}>
        Set Folder
      </button>

      <br />
      <button
        onClick={downloadAudio}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Downloading...' : 'Download M4A'}
      </button>

      <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap', textAlign: 'left', color: '#333' }}>
        {message}
      </pre>
    </div>
  );
}

export default App;

// ESM helper — called via child_process to work around CJS/ESM boundary
// Generates audio + word-timed SRT from Edge TTS word boundary events
import { WebSocket } from 'ws';
import { readFileSync, writeFileSync } from 'fs';

const configPath = process.argv[2];
const { text, output, voice = 'en-US-GuyNeural', rate = '+0%', pitch = '+0Hz' } = JSON.parse(readFileSync(configPath, 'utf-8'));

const baseUrl = 'speech.platform.bing.com/consumer/speech/synthesize/readaloud';
const token = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const webSocketURL = `wss://${baseUrl}/edge/v1?TrustedClientToken=${token}`;

function uuid() {
  return crypto.randomUUID().replaceAll('-', '');
}

function secondsToSRT(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

await new Promise((resolve, reject) => {
  const ws = new WebSocket(`${webSocketURL}&ConnectionId=${uuid()}`, {
    host: 'speech.platform.bing.com',
    origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36 Edg/103.0.1264.44',
    },
  });

  const audioData = [];
  const wordBoundaries = [];

  ws.on('message', (rawData, isBinary) => {
    if (!isBinary) {
      const data = rawData.toString('utf8');

      if (data.includes('Path:audio.metadata')) {
        // Capture word boundary events
        const jsonStart = data.indexOf('{');
        if (jsonStart !== -1) {
          try {
            const metadata = JSON.parse(data.slice(jsonStart));
            for (const item of (metadata.Metadata || [])) {
              if (item.Type === 'WordBoundary') {
                wordBoundaries.push({
                  text: item.Data.text.Text,
                  offset: item.Data.Offset,       // in 100-nanosecond units
                  duration: item.Data.Duration,   // in 100-nanosecond units
                });
              }
            }
          } catch {}
        }
        return;
      }

      if (data.includes('turn.end')) {
        // Write audio file
        writeFileSync(output, Buffer.concat(audioData));

        // Build SRT from word boundaries (8 words per subtitle line)
        if (wordBoundaries.length > 0) {
          const chunkSize = 8;
          const entries = [];
          for (let i = 0; i < wordBoundaries.length; i += chunkSize) {
            const chunk = wordBoundaries.slice(i, i + chunkSize);
            const startSec = chunk[0].offset / 10_000_000;
            const last = chunk[chunk.length - 1];
            const endSec = (last.offset + last.duration) / 10_000_000;
            const chunkText = chunk.map(w => w.text).join(' ');
            entries.push(`${entries.length + 1}\n${secondsToSRT(startSec)} --> ${secondsToSRT(endSec)}\n${chunkText}\n`);
          }
          const srtPath = output.replace(/\.mp3$/, '.srt');
          writeFileSync(srtPath, entries.join('\n'));
        }

        resolve();
        ws.close();
      }
      return;
    }

    // Binary — audio chunk
    const separator = 'Path:audio\r\n';
    const separatorIndex = rawData.indexOf(separator);
    if (separatorIndex !== -1) {
      audioData.push(rawData.subarray(separatorIndex + separator.length));
    }
  });

  ws.on('error', reject);

  // Enable wordBoundaryEnabled: true to get per-word timing
  const speechConfig = JSON.stringify({
    context: {
      synthesis: {
        audio: {
          metadataoptions: { sentenceBoundaryEnabled: false, wordBoundaryEnabled: true },
          outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
        },
      },
    },
  });

  const configMsg = `X-Timestamp:${Date()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n${speechConfig}`;

  ws.on('open', () =>
    ws.send(configMsg, { compress: true }, (err) => {
      if (err) return reject(err);
      const ssml =
        `X-RequestId:${uuid()}\r\nContent-Type:application/ssml+xml\r\n` +
        `X-Timestamp:${Date()}Z\r\nPath:ssml\r\n\r\n` +
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voice}'><prosody pitch='${pitch}' rate='${rate}' volume='+0%'>` +
        `${text}</prosody></voice></speak>`;
      ws.send(ssml, { compress: true }, (err2) => { if (err2) reject(err2); });
    })
  );
});

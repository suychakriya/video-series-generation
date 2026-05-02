/**
 * F5-TTS voice cloning client — calls the Google Colab F5-TTS server.
 * Set F5TTS_NGROK_URL in .env to the URL printed by colab_f5tts_server.ipynb.
 */
import fetch from 'node-fetch';
import * as fs from 'fs';

export async function generateF5TTS(text: string, outputPath: string): Promise<void> {
  const ngrokUrl = process.env.F5TTS_NGROK_URL;
  if (!ngrokUrl) throw new Error('F5TTS_NGROK_URL is not set in .env');

  const speed = parseFloat(process.env.F5TTS_SPEED || '0.85');

  const response = await fetch(`${ngrokUrl.replace(/\/$/, '')}/f5tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, speed }),
  });

  if (!response.ok) {
    throw new Error(`F5-TTS server error ${response.status}: ${await response.text()}`);
  }

  fs.writeFileSync(outputPath, await response.buffer());
}

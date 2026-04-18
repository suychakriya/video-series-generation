/**
 * Khmer TTS client — calls the Google Colab ngrok server running edge_tts.
 * Set KHMER_TTS_NGROK_URL in .env to the URL printed by the Colab notebook.
 */
import fetch from 'node-fetch';
import * as fs from 'fs';

export async function generateKhmerTTS(
  text: string,
  outputPath: string,
  voice = 'km-KH-PisethNeural',
  rate = '-10%',
  pitch = '-5Hz'
): Promise<void> {
  const ngrokUrl = process.env.KHMER_TTS_NGROK_URL;
  if (!ngrokUrl) throw new Error('KHMER_TTS_NGROK_URL is not set in .env');

  const response = await fetch(`${ngrokUrl.replace(/\/$/, '')}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice, rate, pitch }),
  });

  if (!response.ok) {
    throw new Error(`Khmer TTS server error ${response.status}: ${await response.text()}`);
  }

  fs.writeFileSync(outputPath, await response.buffer());
}

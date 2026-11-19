import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTime, validateClipOptions } from '../lib/clip.js';

test('acepta enlaces de Twitch, YouTube y Kick', () => {
  for (const url of [
    'https://www.twitch.tv/videos/123456',
    'https://www.youtube.com/watch?v=abcdefghijk',
    'https://youtu.be/abcdefghijk',
    'https://kick.com/creator'
  ]) {
    assert.equal(validateClipOptions({ url }).url, new URL(url).toString());
  }
});

test('normaliza el inicio y la duración del clip', () => {
  assert.deepEqual(
    validateClipOptions({ url: 'https://kick.com/creator', start: '01:02:03', duration: '45' }),
    { url: 'https://kick.com/creator', startSeconds: 3723, durationSeconds: 45 }
  );
});

test('rechaza dominios ajenos, credenciales y protocolos no permitidos', () => {
  for (const url of [
    'https://example.com/video',
    'https://twitch.tv.example.com/video',
    'https://user:password@twitch.tv/channel',
    'javascript://twitch.tv/video'
  ]) {
    assert.throws(() => validateClipOptions({ url }));
  }
});

test('valida el formato de tiempo y limita la duración a 180 segundos', () => {
  assert.throws(() => validateClipOptions({ url: 'https://kick.com/creator', start: '1:75:00' }));
  assert.throws(() => validateClipOptions({ url: 'https://kick.com/creator', duration: 0 }));
  assert.throws(() => validateClipOptions({ url: 'https://kick.com/creator', duration: 181 }));
});

test('formatea segundos como HH:MM:SS', () => {
  assert.equal(formatTime(3723), '01:02:03');
});

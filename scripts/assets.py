"""Generate the original two-tone chime and a simple 80px app icon; no dependencies."""
import math
import struct
import wave
import zlib
from pathlib import Path

app = Path(__file__).resolve().parents[1] / 'app'
rate = 44100
samples = []
for i in range(int(rate * 2.4)):
    t = i / rate
    value = 0.0
    for start, frequency in [(0, 660), (0.65, 523.25)]:
        dt = t - start
        if dt >= 0:
            envelope = min(dt / 0.008, 1) * math.exp(-3.3 * dt)
            value += envelope * (math.sin(2 * math.pi * frequency * dt) + 0.22 * math.sin(4 * math.pi * frequency * dt))
    samples.append(struct.pack('<h', int(max(-1, min(1, value * 0.42)) * 32767)))
with wave.open(str(app / 'sounds' / 'doorbell.wav'), 'wb') as sound:
    sound.setparams((1, 2, rate, 0, 'NONE', 'not compressed'))
    sound.writeframes(b''.join(samples))

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data) & 0xffffffff)

rows = bytearray()
for y in range(80):
    rows.append(0)
    for x in range(80):
        dome = (x - 40) ** 2 + (y - 34) ** 2 < 16 ** 2 and y <= 34
        body = 24 <= x <= 56 and 34 <= y <= 49
        rim = 19 <= x <= 61 and 50 <= y <= 54
        clapper = (x - 40) ** 2 + (y - 60) ** 2 <= 5 ** 2
        top = 37 <= x <= 43 and 13 <= y <= 21
        rows.extend((196, 235, 149) if dome or body or rim or clapper or top else (27, 40, 33))
png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', 80, 80, 8, 2, 0, 0, 0))
png += chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')
(app / 'icon.png').write_bytes(png)
print('Generated app/icon.png and app/sounds/doorbell.wav')

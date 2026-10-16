#!/usr/bin/env python3
"""
Música 100 % sintetizada (numpy) para los 5 mundos + menú. Sin muestras de terceros => sin problemas de derechos.
Cada pista es un loop sin costura: las colas de las notas se "enrollan" al inicio (wrap-around).
Salida: public/assets/audio/music/<key>.ogg|.mp3   (requiere ffmpeg)
Es una música PLACEHOLDER temporal: cámbiala por pistas de Suno (pago), ACE-Step/Stable Audio o tu propia música
conservando los nombres de archivo (mus_menu, mus_costa, mus_islas, mus_viento, mus_lava, mus_selva).
"""
import numpy as np, subprocess, wave, sys
from pathlib import Path

SR = 44100
OUT = Path(__file__).resolve().parent.parent / 'public/assets/audio/music'
TMP = Path('/tmp/cuntur_music'); TMP.mkdir(exist_ok=True); OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)

def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)

class Track:
    def __init__(self, bpm, bars):
        self.bpm, self.bars = bpm, bars
        self.beat = 60.0 / bpm
        self.n = int(round(bars * 4 * self.beat * SR))
        self.buf = np.zeros(self.n)
    def t(self, beat): return beat * self.beat
    def add(self, beat, sig, gain=1.0):
        s = int(round(beat * self.beat * SR)) % self.n
        L = len(sig)
        end = s + L
        if end <= self.n: self.buf[s:end] += sig * gain
        else:
            k = self.n - s
            self.buf[s:] += sig[:k] * gain
            rest = sig[k:]
            while len(rest):
                m = min(len(rest), self.n); self.buf[:m] += rest[:m]; rest = rest[m:]

def env(n, a=0.005, d=0.2, shape=3.0):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t * shape / max(d, 1e-3))

def marimba(f, dur=0.5):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*f*4*t)*np.exp(-t*30) + 0.15*np.sin(2*np.pi*f*10*t)*np.exp(-t*60)
    return y * env(n, 0.002, dur * 0.45, 3.5)

def pluck(f, dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    y = sum(np.sin(2*np.pi*f*k*t) / k for k in (1, 2, 3, 4, 5)) * np.exp(-t * 14)
    return y * env(n, 0.001, dur, 4)

def steel(f, dur=0.8):
    n = int(dur * SR); t = np.arange(n) / SR
    y = np.sin(2*np.pi*f*t) + 0.5*np.sin(2*np.pi*f*2.01*t)*np.exp(-t*4) + 0.3*np.sin(2*np.pi*f*3.99*t)*np.exp(-t*8)
    y *= 1 + 0.25*np.sin(2*np.pi*6*t)
    return y * env(n, 0.003, dur * 0.6, 3)

def flute(f, dur=0.6, breath=0.12, vib=0.006):
    n = int(dur * SR); t = np.arange(n) / SR
    ph = 2*np.pi*f*t + (vib * f / 5.5) * np.sin(2*np.pi*5.5*t) * np.minimum(1, t / 0.25) * 6
    y = np.sin(ph) + 0.18*np.sin(2*ph) + 0.05*np.sin(3*ph)
    noise = np.diff(rng.standard_normal(n + 1)) * breath
    e = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.12)
    return (y + noise) * e * 0.8

def bass(f, dur=0.4, saw=False):
    n = int(dur * SR); t = np.arange(n) / SR
    if saw: y = sum(np.sin(2*np.pi*f*k*t) / k for k in range(1, 7)) * 0.7
    else: y = np.sin(2*np.pi*f*t) + 0.3*np.sin(2*np.pi*f*2*t)
    return y * env(n, 0.004, dur, 3.2)

def pad(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    y = sum(np.sin(2*np.pi*f*k*t + k) / (k*k) for k in (1, 2, 3)) * (1 + 0.15*np.sin(2*np.pi*0.3*t))
    return y * np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)

def kick(dur=0.28, f0=130, f1=42):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 30)
    return np.sin(2*np.pi*np.cumsum(f) / SR) * np.exp(-t * 11)

def bombo(dur=0.4): return kick(dur, 90, 38) * 1.2

def noise_hit(dur=0.06, hp=True, shape=40):
    n = int(dur * SR); x = rng.standard_normal(n)
    if hp: x = np.diff(np.concatenate([[0], x]))
    return x * np.exp(-np.arange(n) / SR * shape)

def clap(): return noise_hit(0.13, True, 24) * 0.8
def shaker(): return noise_hit(0.05, True, 55) * 0.5
def guiro(l=False): return noise_hit(0.09 if l else 0.04, True, 30 if l else 70) * 0.6

def ambience_waves(tr, gain=0.05):
    n = tr.n; t = np.arange(n) / SR
    x = np.convolve(rng.standard_normal(n), np.ones(40) / 40, 'same')
    cyc = tr.bars * 4 * tr.beat
    lfo = 0.5 + 0.5 * np.sin(2*np.pi*(2 / cyc) * t)
    tr.buf += x * lfo * gain

def chirp(f0, f1, dur=0.12):
    n = int(dur * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * t / dur
    return np.sin(2*np.pi*np.cumsum(f) / SR) * np.sin(np.pi * t / dur) * 0.25

def write(tr, key):
    y = tr.buf.copy()
    y -= np.mean(y)
    y = np.tanh(y * 1.1) / np.tanh(1.1)
    y = y / np.max(np.abs(y)) * 0.7
    wav = TMP / f'{key}.wav'
    with wave.open(str(wav), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((y * 32767).astype('<i2').tobytes())
    for ext, args in (('ogg', ['-c:a', 'libvorbis', '-q:a', '3']), ('mp3', ['-c:a', 'libmp3lame', '-b:a', '112k'])):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(wav), *args, str(OUT / f'{key}.{ext}')], check=True)
    print(f'{key}: {tr.bars} compases, {tr.n / SR:.1f} s')

MAJ, MIN = (0, 4, 7), (0, 3, 7)

def chord_tones(root, q): return [root + i for i in q]

# ---------------- COSTA: cumbia tropical, Do mayor, 96 bpm ----------------
def costa():
    tr = Track(96, 16)
    prog = [(48, MAJ), (45, MIN), (41, MAJ), (43, MAJ)] * 4
    mel = [  # (beat dentro de 4 compases, midi, duración en tiempos)
        (0, 76, .5), (.5, 79, .5), (1, 81, 1), (2.5, 79, .5), (3, 76, 1), (4.5, 76, .5), (5, 72, 1), (6, 74, .5), (6.5, 76, 1.5),
        (8, 77, .5), (8.5, 81, .5), (9, 84, 1), (10.5, 81, .5), (11, 77, 1), (12.5, 79, .5), (13, 76, 1), (14, 74, .5), (14.5, 71, 1.5),
    ]
    for b, (root, q) in enumerate(prog):
        s = b * 4
        tr.add(s, bass(mtof(root), .5), .9); tr.add(s + 1.5, bass(mtof(root + 7), .3), .7)
        tr.add(s + 2, bass(mtof(root), .5), .9); tr.add(s + 3.5, bass(mtof(root + 7), .3), .7)
        for i in range(8): tr.add(s + i * .5, guiro(i % 4 == 0), .5 if i % 2 == 0 else .3)
        tr.add(s, kick(), .8); tr.add(s + 2, kick(), .7); tr.add(s + 1, clap(), .35); tr.add(s + 3, clap(), .35)
        for i, m in enumerate(chord_tones(root + 24, q)): tr.add(s + (1.5 if i % 2 else 1.0) + .5 * (i == 2), pluck(mtof(m), .3), .22)
        tr.add(s + 3.5, pluck(mtof(root + 24 + q[2]), .3), .18)
    for rep in range(4):
        for beat, m, d in mel:
            tr.add(rep * 16 + beat, marimba(mtof(m + (12 if rep == 3 else 0)), .5 + d * .1), .55)
    return tr, 'mus_costa'

# ---------------- ISLAS: isla relajada, Sol mayor, 84 bpm ----------------
def islas():
    tr = Track(84, 16)
    prog = [(43, MAJ), (50, MAJ), (52, MIN), (48, MAJ)] * 4  # G D Em C
    pent = [67, 71, 74, 76, 79, 83]
    pat = [0, 2, 1, 3, 2, 4, 3, 2]
    for b, (root, q) in enumerate(prog):
        s = b * 4
        tr.add(s, bass(mtof(root), 1.2), .8); tr.add(s + 2.5, bass(mtof(root + 7), .8), .6)
        tr.add(s, pad(mtof(root + 24), 4.1), .09); tr.add(s, pad(mtof(root + 24 + q[1]), 4.1), .07); tr.add(s, pad(mtof(root + 24 + q[2]), 4.1), .07)
        for i in range(8):
            tr.add(s + i * .5, steel(mtof(pent[pat[(i + b) % 8] % 6] + (12 if (b // 4) % 2 else 0)), .7), .30 if i % 2 == 0 else .20)
        tr.add(s + 1, shaker(), .6); tr.add(s + 3, shaker(), .6); tr.add(s + .5, shaker(), .3)
        if b % 2 == 0: tr.add(s, kick(.3, 100, 40), .55)
        tr.add(s + 2, clap(), .22)
    ambience_waves(tr, .045)
    return tr, 'mus_islas'

# ---------------- VIENTO (Sierra): sanjuanito/cumbia andina, La menor pentatónica, 100 bpm ----------------
def viento():
    tr = Track(100, 16)
    prog = [(45, MIN), (41, MAJ), (43, MAJ), (45, MIN)] * 4  # Am F G Am
    A = [69, 72, 74, 76, 79, 81]  # La menor pentatónica
    phrase = [(0, 3, 1), (1, 4, .5), (1.5, 3, .5), (2, 2, 1), (3, 1, 1), (4, 2, 1), (5, 0, 1), (6, 1, .5), (6.5, 2, .5), (7, 0, 1),
              (8, 3, 1), (9, 4, .5), (9.5, 5, .5), (10, 4, 1), (11, 3, 1), (12, 2, 1.5), (13.5, 1, .5), (14, 0, 2)]
    for b, (root, q) in enumerate(prog):
        s = b * 4
        tr.add(s, bombo(), 1.0); tr.add(s + 2, bombo(), .85); tr.add(s + 3.5, bombo(.3), .5)
        tr.add(s, bass(mtof(root), .8), .8); tr.add(s + 2, bass(mtof(root + 7), .6), .65)
        for i in range(16):  # charango: rasgueo rápido
            n = [root + 24, root + 24 + q[1], root + 24 + q[2], root + 36][i % 4]
            tr.add(s + i * .25, pluck(mtof(n), .2), .16 if i % 4 else .22)
        for i in range(8): tr.add(s + i * .5 + .25, shaker(), .3)
    for rep in range(4):
        for beat, deg, d in phrase:
            tr.add(rep * 16 + beat, flute(mtof(A[deg] + (12 if rep == 2 else 0)), d * tr.beat + .25), .5)
    return tr, 'mus_viento'

# ---------------- LAVA: intensa, Re menor, 128 bpm ----------------
def lava():
    tr = Track(128, 16)
    prog = [(38, MIN), (34, MAJ), (41, MAJ), (33, MAJ)] * 4  # Dm Bb F A
    for b, (root, q) in enumerate(prog):
        s = b * 4
        for i in range(8): tr.add(s + i * .5, bass(mtof(root + (0 if i % 4 else 12)), .3, True), .55)
        for beat in range(4): tr.add(s + beat, kick(.25, 140, 45), .95)
        tr.add(s + 1, clap(), .55); tr.add(s + 3, clap(), .55)
        for i in range(8): tr.add(s + i * .5 + .25, guiro(), .35)
        if b % 2: tr.add(s + 3.5, noise_hit(.3, True, 9), .5)
        if b % 4 in (0, 2):
            for i, m in enumerate(chord_tones(root + 36, q)): tr.add(s + i * .25, bass(mtof(m), .35, True), .22)
        if b >= 8:
            for i, deg in enumerate([0, 3, 7, 3, 0, 7, 12, 7]): tr.add(s + i * .5, bass(mtof(root + 48 + deg), .22, True), .2)
    return tr, 'mus_lava'

# ---------------- SELVA: misteriosa y húmeda, Mi menor, 104 bpm ----------------
def selva():
    tr = Track(104, 16)
    prog = [(40, MIN), (36, MAJ), (43, MAJ), (35, MAJ)] * 4  # Em C G B
    E = [64, 67, 69, 71, 74, 76]
    for b, (root, q) in enumerate(prog):
        s = b * 4
        tr.add(s, pad(mtof(root + 24), 4.1), .10); tr.add(s, pad(mtof(root + 24 + q[2]), 4.1), .07)
        tr.add(s, bass(mtof(root), 1.0), .7); tr.add(s + 2, bass(mtof(root + 7), .8), .55)
        tr.add(s, bombo(.3), .6); tr.add(s + 1.5, bombo(.25), .4); tr.add(s + 2.5, bombo(.25), .5)
        for i in range(8): tr.add(s + i * .5 + (.25 if i % 2 else 0), shaker(), .35)
        for beat in (.75, 2.25, 3.4): tr.add(s + beat, chirp(2400 + 300 * (b % 3), 3400, .09), .5)
        if b % 2 == 0: tr.add(s + 3.2, chirp(1800, 2600, .14), .4)
        deg = [(0, 2, 4), (1, 3, 2), (2, 4, 3), (3, 1, 0)][b % 4]
        for i, d in enumerate(deg): tr.add(s + 1 + i * .75, flute(mtof(E[d] + (12 if b >= 8 else 0)), .55, .16), .38)
    return tr, 'mus_selva'

# ---------------- MENÚ: alegre, Fa mayor, 108 bpm ----------------
def menu():
    tr = Track(108, 8)
    prog = [(41, MAJ), (48, MAJ), (46, MAJ), (48, MAJ)] * 2  # F C Bb C
    mel = [(0, 77, .5), (.5, 79, .5), (1, 81, 1), (2, 84, 1), (3, 81, 1), (4, 79, 1), (5, 77, .5), (5.5, 74, .5), (6, 72, 2)]
    for b, (root, q) in enumerate(prog):
        s = b * 4
        tr.add(s, bass(mtof(root), .6), .8); tr.add(s + 2, bass(mtof(root + 7), .5), .6)
        tr.add(s, kick(), .6); tr.add(s + 2, kick(), .5); tr.add(s + 1, clap(), .3); tr.add(s + 3, clap(), .3)
        for i in range(8): tr.add(s + i * .5, guiro(i % 4 == 0), .35)
        for i, m in enumerate(chord_tones(root + 24, q)): tr.add(s + 1 + i * .5, pluck(mtof(m), .3), .2)
    for rep in range(2):
        for beat, m, d in mel: tr.add(rep * 16 + beat, marimba(mtof(m), .55), .5)
    return tr, 'mus_menu'

if __name__ == '__main__':
    which = sys.argv[1:] or ['menu', 'costa', 'islas', 'viento', 'lava', 'selva']
    for name in which:
        tr, key = globals()[name]()
        write(tr, key)

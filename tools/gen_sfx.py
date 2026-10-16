#!/usr/bin/env python3
"""
Genera los SFX placeholder de Cuntur por síntesis (100 % originales, sin samples ni copyright).
Uso:  python3 tools/gen_sfx.py  [directorio_salida]
Salida: <out>/<id>.ogg  <out>/<id>.mp3  (+ sfx.json)
Para reemplazar un sonido por uno tuyo: guarda tu archivo con el MISMO nombre (id.ogg / id.mp3).
Requiere: numpy, ffmpeg (libvorbis + libmp3lame).
"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

SR = 44100
RNG = np.random.default_rng(7)  # semilla fija: resultados reproducibles


def t(d):
    return np.linspace(0, d, int(SR * d), endpoint=False)


def env(n, a=0.005, r=0.05, curve=1.0):
    """Envolvente ataque/decay-exponencial para evitar clics."""
    e = np.ones(n)
    na = max(1, int(SR * a))
    e[:na] = np.linspace(0, 1, na)
    nr = max(1, int(SR * r))
    e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def decay(n, k):
    return np.exp(-k * np.linspace(0, 1, n))


def sweep(f0, f1, d, wave_="sine", expo=True):
    x = t(d)
    f = f0 * (f1 / f0) ** (x / d) if expo else np.linspace(f0, f1, len(x))
    ph = 2 * np.pi * np.cumsum(f) / SR
    if wave_ == "square":
        return np.sign(np.sin(ph)) * 0.6
    if wave_ == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    return np.sin(ph)


def tone(f, d, wave_="square", vol=1.0, k=3.0):
    x = sweep(f, f, d, wave_)
    return x * decay(len(x), k) * env(len(x), 0.003, 0.02) * vol


def noise(d):
    return RNG.uniform(-1, 1, int(SR * d))


def lowpass(x, fc):
    # 1er orden simple (suficiente para placeholders)
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    s = 0.0
    for i, v in enumerate(x):
        s = (1 - a) * v + a * s
        y[i] = s
    return y


def highpass(x, fc):
    return x - lowpass(x, fc)


def seq(parts, gap=0.0):
    out = []
    for p in parts:
        out.append(p)
        if gap:
            out.append(np.zeros(int(SR * gap)))
    return np.concatenate(out)


def mix(*xs):
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[: len(x)] += x
    return out


NOTE = {"C4": 261.63, "D4": 293.66, "E4": 329.63, "G4": 392.0, "A4": 440.0, "B4": 493.88,
        "C5": 523.25, "D5": 587.33, "E5": 659.25, "G5": 783.99, "A5": 880.0, "C6": 1046.5}

# ---------------------------------------------------------------- sonidos
def flap():
    n = noise(0.16)
    sw = highpass(lowpass(n, 3500), 600) * np.linspace(0.2, 1, len(n)) ** 0.5
    sw *= env(len(sw), 0.01, 0.1) * 0.7
    return mix(sw, sweep(260, 520, 0.12, "tri") * 0.25 * env(int(SR * 0.12), 0.005, 0.08))


def collect():
    return seq([tone(NOTE["E5"], 0.07, "square", 0.55, 2), tone(NOTE["A5"], 0.14, "square", 0.55, 3)])


def collect_big():
    notes = ["C5", "E5", "G5", "C6"]
    parts = [tone(NOTE[n], 0.09, "square", 0.5, 2) for n in notes[:-1]]
    parts.append(mix(tone(NOTE["C6"], 0.3, "square", 0.45, 3), tone(NOTE["G5"], 0.3, "tri", 0.4, 3)))
    return seq(parts)


def hit():
    n = lowpass(noise(0.25), 2500) * decay(int(SR * 0.25), 6)
    return mix(n * 0.8, sweep(330, 70, 0.28, "square") * 0.45 * decay(int(SR * 0.28), 4) * env(int(SR * 0.28), 0.002, 0.05))


def heart_lost():
    thud = sweep(130, 45, 0.35, "sine") * decay(int(SR * 0.35), 5)
    n = lowpass(noise(0.12), 900) * decay(int(SR * 0.12), 8) * 0.5
    return mix(thud, n) * env(int(SR * 0.35), 0.002, 0.08)


def win():
    notes = ["C5", "E5", "G5", "C6"]
    parts = [tone(NOTE[n], 0.12, "square", 0.5, 2) for n in notes]
    parts.append(mix(tone(NOTE["C6"], 0.55, "square", 0.4, 2.5), tone(NOTE["E5"], 0.55, "tri", 0.4, 2.5),
                     tone(NOTE["G5"], 0.55, "tri", 0.35, 2.5)))
    return seq(parts)


def lose():
    notes = [("G4", 0.18), ("E4", 0.18), ("D4", 0.2), ("C4", 0.5)]
    return seq([tone(NOTE[n], d, "tri", 0.8, 2.2) for n, d in notes])


def portal_open():
    d = 0.8
    x = sweep(300, 1400, d, "sine")
    vib = 1 + 0.02 * np.sin(2 * np.pi * 9 * t(d))
    x = np.sin(2 * np.pi * np.cumsum(300 * (1400 / 300) ** (t(d) / d) * vib) / SR)
    sparkle = highpass(noise(d), 4000) * np.linspace(0, 1, len(x)) * 0.12
    return (x * 0.7 + sparkle) * env(len(x), 0.02, 0.2)


def ui_click():
    return mix(tone(1400, 0.035, "square", 0.5, 6), highpass(noise(0.015), 3000) * 0.3)


def squish():
    d = 0.26
    n = lowpass(noise(d), 1200) * decay(int(SR * d), 3.5)
    return mix(n * 0.8, sweep(240, 70, d, "sine") * 0.6 * decay(int(SR * d), 3)) * env(int(SR * d), 0.004, 0.07)


def crunch():
    parts = []
    for i in range(3):
        c = highpass(noise(0.05), 1500) * decay(int(SR * 0.05), 9)
        parts.append(c)
        parts.append(np.zeros(int(SR * 0.035)))
    return np.concatenate(parts) * 0.9


def gust():
    d = 1.0
    n = lowpass(highpass(noise(d), 300), 1800)
    e = np.sin(np.pi * t(d) / d) ** 1.5
    return n * e * 0.6


SOUNDS = {
    "flap": (flap, "Aleteo"), "collect": (collect, "Recoger comida"), "collect_big": (collect_big, "Hito de la barra"),
    "hit": (hit, "Choque"), "heart_lost": (heart_lost, "Pierde un corazón"), "win": (win, "Victoria del mundo"),
    "lose": (lose, "Derrota"), "portal_open": (portal_open, "Se abre el portal"), "ui_click": (ui_click, "Clic de interfaz"),
    "squish": (squish, "Enemigo aplastado (chontacuro)"), "crunch": (crunch, "Chifle crujiente"), "gust": (gust, "Ráfaga de viento"),
}


def to_int16(x, peak=0.7):
    x = x - np.mean(x)
    m = np.max(np.abs(x)) or 1.0
    return (x / m * peak * 32767).astype(np.int16)


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "sfx")
    out.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for sid, (fn, label) in SOUNDS.items():
        pcm = to_int16(fn())
        wav = out / f"{sid}.wav"
        with wave.open(str(wav), "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
        for codec, ext, q in (("libvorbis", "ogg", "4"), ("libmp3lame", "mp3", "4")):
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-c:a", codec, "-q:a", q,
                            str(out / f"{sid}.{ext}")], check=True)
        wav.unlink()
        manifest[sid] = {"label": label, "files": [f"{sid}.ogg", f"{sid}.mp3"],
                         "durationMs": int(len(pcm) / SR * 1000), "source": "synth"}
    (out / "sfx.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    print(f"OK: {len(manifest)} sonidos en {out}")


if __name__ == "__main__":
    main()

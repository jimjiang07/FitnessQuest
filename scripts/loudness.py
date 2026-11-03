"""Makes speech and beeps cut through music: compress, then boost to just under full scale. Stdlib only.
Usage: python loudness.py in.wav out.wav   (16-bit mono PCM in and out)
Also importable: process(samples, rate) -> samples, tone(...) for beeps."""
import array, math, sys, wave

CEILING_DB = -0.8      # leave a little headroom so AAC encoding doesn't clip
THRESHOLD_DB = -34.0   # everything above this is squashed...
RATIO = 8.0            # ...this hard, so quiet syllables come up close to the loud ones
DRIVE = 4.0            # fast soft limiter: rounds off syllable peaks so speech sits ~8 dB louder at the same ceiling
PAD = 0.04             # seconds of silence kept around speech; edge-tts pads ~0.5 s, which delays every cue


def db(x):
    return 20 * math.log10(max(x, 1e-9))


def read(path):
    with wave.open(path, 'rb') as w:
        assert w.getsampwidth() == 2 and w.getnchannels() == 1, 'expects 16-bit mono'
        data = array.array('h', w.readframes(w.getnframes()))
        return [s / 32768 for s in data], w.getframerate()


def write(path, samples, rate):
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(array.array('h', (max(-32767, min(32767, int(s * 32767))) for s in samples)).tobytes())


def trim(samples, rate, floor_db=-45.0):
    floor = 10 ** (floor_db / 20)
    loud = [i for i, s in enumerate(samples) if abs(s) > floor]
    if not loud:
        return samples
    pad = int(PAD * rate)
    return samples[max(0, loud[0] - pad):loud[-1] + pad]


def process(samples, rate):
    attack = math.exp(-1 / (0.003 * rate))
    release = math.exp(-1 / (0.080 * rate))
    env, out = 0.0, []
    for s in samples:
        a = abs(s)
        env = attack * env + (1 - attack) * a if a > env else release * env + (1 - release) * a
        over = db(env) - THRESHOLD_DB
        gain_db = -over * (1 - 1 / RATIO) if over > 0 else 0.0
        out.append(s * 10 ** (gain_db / 20))
    peak = max((abs(s) for s in out), default=0) or 1
    ceiling, norm = 10 ** (CEILING_DB / 20), math.tanh(DRIVE)
    return [ceiling * math.tanh(DRIVE * s / peak) / norm for s in out]


def rms_db(samples, floor_db=-40.0):
    # loudness of the speech itself, ignoring pauses
    floor = 10 ** (floor_db / 20)
    active = [s for s in samples if abs(s) > floor] or samples
    return db(math.sqrt(sum(s * s for s in active) / max(len(active), 1)))


def tone(rate, freqs, seconds, gap=0.0, repeats=1):
    """Bright beep: a few odd harmonics (square-ish, cuts through music) with short fades, repeated with gaps."""
    n, fade = int(seconds * rate), int(0.006 * rate)
    one = []
    for i in range(n):
        t = i / rate
        v = sum(math.sin(2 * math.pi * f * k * t) / k for f in freqs for k in (1, 3, 5)) / len(freqs)
        env = min(1.0, i / fade, (n - 1 - i) / fade)
        one.append(v * env)
    out = []
    for r in range(repeats):
        out += one + ([0.0] * int(gap * rate) if r < repeats - 1 else [])
    return process(out, rate)


if __name__ == '__main__':
    src, rate = read(sys.argv[1])
    dst = process(trim(src, rate), rate)
    write(sys.argv[2], dst, rate)
    print(f'speech rms {rms_db(src):.1f} → {rms_db(dst):.1f} dBFS, {len(src) / rate:.2f} → {len(dst) / rate:.2f} s')

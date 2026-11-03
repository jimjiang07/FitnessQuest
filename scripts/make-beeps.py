"""Writes the countdown beeps to public/sounds/ (beep-short.m4a for 3·2·1, beep-long.m4a for Go).
Bright double tones at the pitches ears pick out of music, mastered as loud as the voice. Needs macOS afconvert."""
import importlib.util, os, subprocess, sys, tempfile

here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('loudness', os.path.join(here, 'loudness.py'))
loudness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(loudness)

RATE = 44100
BEEPS = {
    'short': dict(freqs=[1760, 2637], seconds=0.16),            # A6 + E7: a bright chirp for 3·2·1
    'long': dict(freqs=[2093, 3136], seconds=0.55),             # C7 + G7: higher and longer for Go
}

out = os.path.join(here, '..', 'public', 'sounds')
os.makedirs(out, exist_ok=True)
work = tempfile.mkdtemp(prefix='fq-beeps-')
for name, spec_ in BEEPS.items():
    wav = os.path.join(work, name + '.wav')
    loudness.write(wav, loudness.tone(RATE, spec_['freqs'], spec_['seconds']), RATE)
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '96000', wav, os.path.join(out, f'beep-{name}.m4a')], check=True)
    print(f'beep-{name}.m4a')

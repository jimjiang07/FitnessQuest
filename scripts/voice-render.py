"""Records sentences with edge-tts for make-voice.mjs, then makes them loud enough to cut through music.
Args: jobs.json (a list of {id, text}) out_dir voice rate. Needs macOS afconvert (mp3 → wav → AAC m4a)."""
import asyncio, importlib.util, json, os, subprocess, sys, tempfile

import edge_tts

# -I keeps the script's folder off sys.path, so load the sibling module by path
spec = importlib.util.spec_from_file_location('loudness', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'loudness.py'))
loudness = importlib.util.module_from_spec(spec)
spec.loader.exec_module(loudness)

jobs = json.load(open(sys.argv[1]))
out, voice, rate = sys.argv[2:5]
gate = asyncio.Semaphore(6)  # a few at a time: the free service throttles bursts
work = tempfile.mkdtemp(prefix='fq-voice-')


def master(mp3, m4a):
    wav, loud = mp3[:-4] + '.wav', mp3[:-4] + '-loud.wav'
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@24000', '-c', '1', mp3, wav], check=True)
    samples, sr = loudness.read(wav)
    loudness.write(loud, loudness.process(loudness.voice_eq(loudness.trim(samples, sr), sr), sr), sr)
    part = m4a + '.part'
    subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '64000', loud, part], check=True)
    os.replace(part, m4a)


async def record(job):
    async with gate:
        for attempt in range(4):
            try:
                mp3 = os.path.join(work, job['id'] + '.mp3')
                await edge_tts.Communicate(job['text'], voice, rate=rate).save(mp3)
                await asyncio.to_thread(master, mp3, os.path.join(out, job['id'] + '.m4a'))
                print('.', end='', flush=True)
                return
            except Exception as e:
                if attempt == 3:
                    raise RuntimeError(f'could not record "{job["text"]}"') from e
                await asyncio.sleep(2 * (attempt + 1))


async def main():
    await asyncio.gather(*(record(j) for j in jobs))
    print()


asyncio.run(main())

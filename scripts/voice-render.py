"""Records sentences with edge-tts for make-voice.mjs. Args: jobs.json (a list of {id, text}) out_dir voice rate."""
import asyncio, json, os, sys

import edge_tts

jobs = json.load(open(sys.argv[1]))
out, voice, rate = sys.argv[2:5]
gate = asyncio.Semaphore(6)  # a few at a time: the free service throttles bursts


async def record(job):
    async with gate:
        for attempt in range(4):
            try:
                part = os.path.join(out, job["id"] + ".mp3.part")
                await edge_tts.Communicate(job["text"], voice, rate=rate).save(part)
                os.replace(part, part[:-5])
                print(".", end="", flush=True)
                return
            except Exception as e:
                if attempt == 3:
                    raise RuntimeError(f'could not record "{job["text"]}"') from e
                await asyncio.sleep(2 * (attempt + 1))


async def main():
    await asyncio.gather(*(record(j) for j in jobs))
    print()


asyncio.run(main())

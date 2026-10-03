# 小智 WebSocket 协议探针：对比“只发一次 listen start”与“每轮 tts stop 后重发 listen start”
# 凭据从 xzcfg.json 读取，日志中不输出 token / mac
import sys, os, json, time, wave, asyncio, ctypes, argparse, uuid
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, 'pylib'))
os.add_dll_directory(HERE)
import ctypes.util
_orig = ctypes.util.find_library
ctypes.util.find_library = lambda n: os.path.join(HERE, 'opus.dll') if n == 'opus' else _orig(n)
import opuslib
import websockets

FRAME = 960  # 60ms@16k

def load_frames(path):
    w = wave.open(path, 'rb')
    assert w.getframerate() == 16000 and w.getnchannels() == 1
    pcm = w.readframes(w.getnframes())
    enc = opuslib.Encoder(16000, 1, opuslib.APPLICATION_VOIP)
    out = []
    for i in range(0, len(pcm), FRAME * 2):
        chunk = pcm[i:i + FRAME * 2]
        if len(chunk) < FRAME * 2:
            chunk += b'\0' * (FRAME * 2 - len(chunk))
        out.append(enc.encode(chunk, FRAME))
    return out

SIL = opuslib.Encoder(16000, 1, opuslib.APPLICATION_VOIP).encode(b'\0' * FRAME * 2, FRAME)

async def run(mode, rounds, logf):
    cfg = json.load(open(os.path.join(HERE, 'xzcfg.json')))
    headers = {'Authorization': 'Bearer ' + cfg['token'], 'Protocol-Version': '1',
               'Device-Id': cfg['macAddress'], 'Client-Id': cfg['macAddress']}
    t0 = time.time()
    def log(*a):
        line = f"{time.time()-t0:8.3f} " + ' '.join(str(x) for x in a)
        print(line, flush=True); logf.write(line + '\n'); logf.flush()
    qs = [load_frames(os.path.join(HERE, 'wav', f'q{i}.wav')) for i in range(12)]
    async with websockets.connect(cfg['websocketUrl'], additional_headers=headers, max_size=None, open_timeout=15) as ws:
        await ws.send(json.dumps({'type': 'hello', 'version': 1, 'transport': 'websocket',
                                  'audio_params': {'format': 'opus', 'sample_rate': 16000, 'channels': 1, 'frame_duration': 60}}))
        state = {'sid': None, 'tts': None, 'first_audio': None, 'q_end': None, 'stt': [], 'bin': 0, 'closed': False, 'tts_stop_evt': asyncio.Event(), 'hello': asyncio.Event()}
        async def reader():
            try:
                async for m in ws:
                    if isinstance(m, bytes):
                        state['bin'] += 1
                        if state['first_audio'] is None and state['q_end'] is not None:
                            state['first_audio'] = time.time()
                            log('FIRST_AUDIO latency_from_speech_end=%.3fs' % (state['first_audio'] - state['q_end']))
                        continue
                    d = json.loads(m)
                    t = d.get('type')
                    if t == 'hello':
                        state['sid'] = d.get('session_id'); log('SERVER hello audio_params=', d.get('audio_params'), 'transport=', d.get('transport')); state['hello'].set()
                    elif t == 'tts':
                        log('tts', d.get('state'), (d.get('text') or '')[:60])
                        state['tts'] = d.get('state')
                        if d.get('state') == 'stop':
                            state['tts_stop_evt'].set()
                    elif t in ('stt', 'llm'):
                        log(t, json.dumps({k: v for k, v in d.items() if k not in ('session_id',)}, ensure_ascii=False)[:120])
                        if t == 'stt': state['stt'].append(d.get('text'))
                    else:
                        log('msg', t, json.dumps({k: v for k, v in d.items() if k != 'session_id'}, ensure_ascii=False)[:160])
            except websockets.ConnectionClosed as e:
                log('CLOSED', e.code, e.reason)
            state['closed'] = True
        rt = asyncio.create_task(reader())
        await asyncio.wait_for(state['hello'].wait(), 10)

        async def send_frames(frames):
            nxt = time.time()
            for f in frames:
                if state['closed']: return
                await ws.send(f)
                nxt += 0.06
                await asyncio.sleep(max(0, nxt - time.time()))

        async def listen_start():
            await ws.send(json.dumps({'session_id': state['sid'], 'type': 'listen', 'state': 'start', 'mode': 'auto'}))
            log('SEND listen start auto')

        await listen_start()
        results = []
        for r in range(rounds):
            if state['closed']: break
            state['tts_stop_evt'].clear(); state['first_audio'] = None
            n_stt = len(state['stt'])
            await send_frames([SIL] * 8)
            log(f'ROUND {r+1} speak q{r % 12}')
            await send_frames(qs[r % 12])
            state['q_end'] = time.time()
            # 持续推送静音（模拟麦克风常开），等待 tts stop，最多 25s
            async def sil_until_stop():
                while not state['tts_stop_evt'].is_set() and not state['closed']:
                    await send_frames([SIL])
            try:
                await asyncio.wait_for(sil_until_stop(), 25)
                ok = True
            except asyncio.TimeoutError:
                ok = False
            lat = (state['first_audio'] - state['q_end']) if state['first_audio'] else None
            results.append({'round': r + 1, 'stt': state['stt'][n_stt:], 'tts_stop': ok, 'first_audio_s': lat})
            log('RESULT', json.dumps(results[-1], ensure_ascii=False))
            if not ok and mode == 'once':
                # 第一种模式下若无回复，继续尝试一轮再结束
                if r >= 2: break
            if mode == 'relisten' and ok:
                await send_frames([SIL] * 3)
                await listen_start()
        await ws.send(json.dumps({'session_id': state['sid'], 'type': 'abort'}))
        await ws.close()
        await rt
        return results

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('mode', choices=['once', 'relisten']); ap.add_argument('--rounds', type=int, default=3)
    a = ap.parse_args()
    with open(os.path.join(HERE, f'probe-{a.mode}-{time.strftime("%H%M%S")}.log'), 'w', encoding='utf-8') as lf:
        res = asyncio.run(run(a.mode, a.rounds, lf))
        lf.write(json.dumps(res, ensure_ascii=False) + '\n')
        print(json.dumps(res, ensure_ascii=False))

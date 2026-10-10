# -*- coding: utf-8 -*-
"""v0.19.4 の index.html（patch19.py＋patch19_extra.py の出力・md5 9d592cfd…）に v0.19.5〜v0.20.1 の直しを当てる。
使い方:  python patch20.py <v0.19.4 の index.html> <出力する index.html>
中身は patch20.json（行の入れ替えの一覧）。当てる前と後の md5 を確かめ、合わなければ何も書かずに止まる。
土台（patch19 の出力）を変えた時は、この当て方は使えない（at の行がずれる）。その時は 読んで_v0.20.md の「変えた所」を見て手で入れる。"""
import sys, json, hashlib, os, io
here = os.path.dirname(os.path.abspath(__file__))
src, dst = sys.argv[1], sys.argv[2]
doc = json.load(io.open(os.path.join(here, 'patch20.json'), encoding='utf-8'))
raw = io.open(src, 'rb').read()
if hashlib.md5(raw).hexdigest() != doc['from_md5']:
    sys.exit('NG: もとの index.html が v0.19.4 と違う（md5 %s・期待 %s）' % (hashlib.md5(raw).hexdigest(), doc['from_md5']))
a = raw.decode('utf-8').split('\n'); out = []; pos = 0
for o in doc['ops']:
    if a[o['at']:o['at'] + len(o['del'])] != o['del']:
        sys.exit('NG: %d 行目が合わない' % (o['at'] + 1))
    out += a[pos:o['at']] + o['ins']; pos = o['at'] + len(o['del'])
out += a[pos:]
res = '\n'.join(out).encode('utf-8')
if hashlib.md5(res).hexdigest() != doc['to_md5']:
    sys.exit('NG: 当てた結果が公開した物と違う')
io.open(dst, 'wb').write(res)
sys.stdout.write('OK %d places  %s -> %s  (%d bytes)\n' % (len(doc['ops']), doc['from_md5'][:8], doc['to_md5'][:8], len(res)))

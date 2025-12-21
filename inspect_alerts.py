from pathlib import Path
path = Path('Canvas.tsx')
data = path.read_bytes()
needle = b'alert'
pos = 0
while True:
    idx = data.find(needle, pos)
    if idx == -1:
        break
    snippet = data[idx:idx+120]
    print(idx, snippet)
    pos = idx + 1

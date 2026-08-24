# Physics benchmark sample

- Source title: **Stationary states: key equations**, from *MIT 8.04 Quantum Physics I (Spring 2016)*
- Source URL: https://ocw.mit.edu/courses/8-04-quantum-physics-i-spring-2016/resources/stationary-states-key-equations/
- Speaker: Prof. Barton Zwiebach
- Source organization: MIT OpenCourseWare
- Exact start timestamp: `00:14:24.180`
- Exact end timestamp: `00:14:38.940`
- Excerpt duration: `14.760 seconds`
- Output: `physics.pcm` — raw PCM, 16,000 Hz, mono, signed 16-bit little endian

The passage includes the terms “eigenstates,” “eigenvalues,” and “eigenfunction equation.” MIT's supplied English captions read:

> Because you remember eigenstates and eigenvalues of matrices are peculiar numbers. If you have a matrix, they're peculiar eigenvalues. So this equation is an eigenfunction equation.

Only the selected section was downloaded from the YouTube copy embedded by MIT OCW:

```bash
yt-dlp --no-playlist \
  --download-sections '*14:24.180-14:38.940' \
  --force-keyframes-at-cuts \
  -f 'bestaudio[ext=m4a]/bestaudio' \
  -o '/tmp/rtta-physics-source.%(ext)s' \
  'https://www.youtube.com/watch?v=8KQ-yK2xm60'

ffmpeg -i /tmp/rtta-physics-source.m4a \
  -ac 1 -ar 16000 -acodec pcm_s16le -f s16le \
  samples/physics.pcm
```

The generated audio files are intentionally ignored by Git.

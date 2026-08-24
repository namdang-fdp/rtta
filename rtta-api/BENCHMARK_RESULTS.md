# Azure Speech Translation physics spike

Run date: 2026-08-23 (Asia/Ho_Chi_Minh)

This was one Azure Speech Translation session using the raw, unhinted service. No phrase list, custom model, glossary, prompt, correction, or retry was used.

## Input

- Source: MIT OpenCourseWare, *Stationary states: key equations*, Prof. Barton Zwiebach
- Excerpt: `00:14:24.180` to `00:14:38.940`
- Audio: 14.760 seconds, raw PCM, 16 kHz, mono, signed 16-bit little endian
- Streaming: real-time paced 50 ms chunks (1,600 bytes each)
- Azure: Speech SDK 1.51.0, region `koreacentral`, `en-US` to `vi`

## Measurements

| Measurement | Result |
|---|---:|
| Session started | 1 ms wall time |
| First non-empty English partial | 2,185 ms wall time |
| First non-empty Vietnamese partial | 2,185 ms wall time |
| Lag of first non-empty partial | 865 ms |
| First useful Vietnamese partial | 3,466 ms wall time |
| Estimated lag of first useful Vietnamese partial | 1,116 ms |
| Final result | 15,851 ms wall time |
| Final estimated lag | 2,021 ms |
| Final arrival after all audio was sent | 1,091 ms |
| Maximum estimated lag (partials and final) | 2,021 ms |
| Average estimated lag (19 partials and 1 final) | 971.3 ms |
| Non-empty partials / finals | 19 / 1 |
| Audio actually sent | 14.760 seconds |

The first useful subtitle heuristic was a non-empty Vietnamese partial of at least three whitespace-separated words. At 3,466 ms it was `Nhớ trạng thái riêng`, based on recognized audio ending at 2,350 ms.

## Raw final result

English:

> Remember, eigen States and eigenvalues of matrices are peculiar numbers if you have a matrix or peculiar optimal values. So this equation is an eigenfunction equation.

Vietnamese:

> Hãy nhớ rằng, trạng thái riêng và giá trị riêng của ma trận là các số kỳ lạ nếu bạn có ma trận hoặc các giá trị tối ưu đặc biệt. Vì vậy, phương trình này là một phương trình hàm riêng.

## Terminology observations

- `eigenstates`: semantically recognized but incorrectly split/cased as `eigen States`; translated acceptably as `trạng thái riêng`.
- `eigenvalues` (first occurrence): recognized and translated correctly as `giá trị riêng`.
- `matrices`: recognized and translated correctly as `ma trận`.
- `eigenfunction equation`: recognized and translated acceptably as `phương trình hàm riêng`.
- `they're peculiar eigenvalues` (second occurrence): materially misrecognized as `or peculiar optimal values`, then translated from that wrong English result. This is the clearest domain-terminology failure.

Azure connected and completed on CachyOS without a native-library or OpenSSL error. It reported `EndOfStream / NoError` through the canceled event immediately before `SESSION STOPPED`; this is normal end-of-input, not a service failure. The live process initially exited with status 1 because the spike treated every canceled callback as an error. That harness classification was fixed afterward and verified only with offline tests; the Azure benchmark was not rerun.

## Assessment

**BORDERLINE** for the approximate `<= 1.2 s` useful subtitle-lag target.

The first useful Vietnamese partial arrived at an estimated 1.116 seconds of lag, narrowly inside the target, and the all-event average was under one second. However, several partials exceeded 1.2 seconds, the stable final lag was 2.021 seconds, and one repeated `eigenvalues` phrase was materially misrecognized. A single 14.760-second sample is not enough to generalize beyond this spike.

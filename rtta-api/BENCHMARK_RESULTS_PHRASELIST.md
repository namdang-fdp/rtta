# Azure Speech Translation physics spike — PhraseListGrammar

Run date: 2026-08-23 (Asia/Ho_Chi_Minh)

Run B changed one intended recognition variable from Run A: a `PhraseListGrammar` was attached to the existing `TranslationRecognizer` before continuous recognition started. The same Azure resource, SDK 1.51.0, languages, PCM bytes, 50 ms pacing, timing method, quota guard, event handlers, and single-session/no-retry behavior were retained.

Run A remains unchanged in `BENCHMARK_RESULTS.md`.

## Input and phrase-list configuration

- Source: MIT OpenCourseWare, *Stationary states: key equations*, Prof. Barton Zwiebach
- Excerpt: `00:14:24.180` to `00:14:38.940`
- Audio: 14.760 seconds, 472,320 bytes, SHA-256 `ce5dec8cdb2b0062fd54f0605b99e47474e6899a47784062a8bf147f4831d859`
- PCM: 16 kHz, mono, signed 16-bit little endian
- Streaming: real-time paced 50 ms chunks (1,600 bytes each)
- Azure: Speech SDK 1.51.0, region `koreacentral`, `en-US` to `vi`
- Phrase-list weight: `1.5`
- Phrase-list terms:
  - `eigenstate`
  - `eigenstates`
  - `eigenvalue`
  - `eigenvalues`
  - `eigenfunction`
  - `Hamiltonian`
  - `quantum state`
  - `wave function`
  - `Schrodinger equation`
  - `Schrödinger equation`

No sentence-specific phrase, stable-partial tuning, custom model, segmentation change, post-correction, or retry was used.

## Run B measurements

| Measurement | Result |
|---|---:|
| Session started | 1 ms wall time |
| First non-empty English partial | 2,550 ms wall; 1,230 ms estimated lag |
| First non-empty Vietnamese partial | 2,550 ms wall; 1,230 ms estimated lag |
| First useful Vietnamese partial | 3,132 ms wall; 972 ms estimated lag |
| P50 partial estimated lag | 905 ms |
| P90 partial estimated lag | 1,576 ms |
| P95 partial estimated lag | 1,635 ms |
| Maximum partial estimated lag | 1,695 ms |
| Mean partial estimated lag | 1,020.6 ms; secondary only because partials are correlated |
| Final result | 15,422 ms wall time |
| Final estimated lag | 1,592 ms |
| Final arrival after all audio was sent | 662 ms |
| Non-empty partials / finals | 21 / 1 |
| Audio actually sent | 14.760 seconds |

The first English and Vietnamese partials were `remember` / `nhớ`. The first useful Vietnamese partial was classified without changing the Run A heuristic: at least three words communicating domain content. It was `nhớ trạng thái riêng` at 3,132 ms wall time, based on recognized audio ending at 2,160 ms, giving 972 ms estimated lag.

Percentiles use the nearest-rank method over non-empty partial-event estimated lags. The mean is not a primary KPI because successive partials are correlated revisions of the same utterance.

Azure connected successfully and completed normally. It emitted `EndOfStream / NoError` before `SESSION STOPPED`; there was no cancellation error, native-library error, or retry.

## A/B latency comparison

Delta is Run B minus Run A; for latency, a negative delta is faster.

| Metric | Run A: vanilla | Run B: PhraseList | Delta |
|---|---:|---:|---:|
| First EN partial wall time | 2,185 ms | 2,550 ms | +365 ms |
| First EN partial lag | 865 ms | 1,230 ms | +365 ms |
| First VI partial wall time | 2,185 ms | 2,550 ms | +365 ms |
| First VI partial lag | 865 ms | 1,230 ms | +365 ms |
| First useful VI wall time | 3,466 ms | 3,132 ms | -334 ms |
| First useful VI lag | 1,116 ms | 972 ms | -144 ms |
| P50 partial lag | 865 ms | 905 ms | +40 ms |
| P90 partial lag | 1,345 ms | 1,576 ms | +231 ms |
| P95 partial lag | 1,752 ms | 1,635 ms | -117 ms |
| Maximum partial lag | 1,752 ms | 1,695 ms | -57 ms |
| Final lag | 2,021 ms | 1,592 ms | -429 ms |
| Partial count | 19 | 21 | +2 |
| Final count | 1 | 1 | 0 |

Run A P50/P90/P95 and maximum partial lag were calculated with the same nearest-rank method from the 19 raw partial-event lags retained from the Run A execution output. They were not invented from the aggregate mean in the baseline report.

Latency did not show a uniform penalty. The first generic fragment was 365 ms slower and P90 was 231 ms worse, while the first useful domain subtitle was 144 ms faster and final lag improved by 429 ms. The median changed by only 40 ms.

## Transcript comparison

### Run A English

> Remember, eigen States and eigenvalues of matrices are peculiar numbers if you have a matrix or peculiar optimal values. So this equation is an eigenfunction equation.

### Run B English

> Remember eigenstates and eigenvalues, eigenvalues and eigenvalues. Eigenvalues of matrices are peculiar numbers if you have a matrix or peculiar eigenvalues. So this equation is an eigenvalue is an eigenfunction equation.

### Run A Vietnamese

> Hãy nhớ rằng, trạng thái riêng và giá trị riêng của ma trận là các số kỳ lạ nếu bạn có ma trận hoặc các giá trị tối ưu đặc biệt. Vì vậy, phương trình này là một phương trình hàm riêng.

### Run B Vietnamese

> Hãy nhớ các trạng thái riêng và giá trị riêng, giá trị riêng và giá trị riêng. Giá trị riêng của ma trận là số kỳ lạ nếu bạn có ma trận hoặc giá trị riêng kỳ lạ. Vì vậy, phương trình này là một giá trị riêng là một phương trình hàm riêng.

## Terminology and error analysis

| Term or passage | Run B observation | Error layer |
|---|---|---|
| `eigenstates` | Correctly recognized as one word and translated as `trạng thái riêng`. This improved over Run A's split `eigen States`. | Improved ASR; translation correct |
| First `eigenvalues` | Correct domain term, but the recognizer inserted several unsupported repetitions of `eigenvalues`. | ASR over-bias / hallucination |
| `matrices` | Correctly recognized and translated as `ma trận`. | No material error |
| `they're peculiar eigenvalues` | The key term became `peculiar eigenvalues`; the Run A `optimal values` error disappeared. The connector was still rendered as `or`. | Domain ASR improved; remaining non-domain ASR error |
| `eigenfunction equation` | The intended term was recognized and translated as `phương trình hàm riêng`, but Azure inserted `an eigenvalue is` immediately before it. | ASR over-bias / hallucination; Vietnamese faithfully propagated it |

The Vietnamese domain translations were reasonable when the English recognition was correct: `trạng thái riêng`, `giá trị riêng`, `ma trận`, and `phương trình hàm riêng`. The major new Vietnamese defects are downstream consequences of incorrect English insertions, not independent translation failures.

The phrase list therefore corrected the specific missing domain term but reduced overall ASR fidelity by repeatedly forcing glossary terms into the utterance.

## Assessment

**NOT SUITABLE** for this exact phrase list and weight configuration.

Useful-subtitle and final latency improved, so latency itself was not the disqualifying factor. The previous `optimal values` failure was corrected, but weight 1.5 caused meaningful new recognition regressions: repeated unsupported `eigenvalues` and an inserted `eigenvalue` before `eigenfunction equation`. Under the experiment's stated criteria, those glossary-induced hallucinations outweigh the isolated terminology correction.

This remains one 14.760-second sample. It shows that a pre-meeting glossary can influence the desired terms without necessarily harming median latency, but it does not support deploying this phrase-list configuration unchanged.

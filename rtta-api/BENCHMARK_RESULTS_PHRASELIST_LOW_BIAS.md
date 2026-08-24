# Azure Speech Translation physics spike — low-bias PhraseListGrammar

Run date: 2026-08-24 (Asia/Ho_Chi_Minh)

Run C was the final Azure tuning run in this spike. It reused the existing benchmark without implementation changes and changed only two tightly related PhraseList parameters from Run B: weight `1.1` and a four-entry canonical glossary. Exactly one Azure session was opened, with no retry.

The prior reports remain unchanged:

- Run A: `BENCHMARK_RESULTS.md`
- Run B: `BENCHMARK_RESULTS_PHRASELIST.md`

## Controlled input and configuration

- Source: MIT OpenCourseWare, *Stationary states: key equations*, Prof. Barton Zwiebach
- Excerpt: `00:14:24.180` to `00:14:38.940`
- Audio: 14.760 seconds, 472,320 bytes
- PCM SHA-256: `ce5dec8cdb2b0062fd54f0605b99e47474e6899a47784062a8bf147f4831d859`
- PCM: 16 kHz, mono, signed 16-bit little endian
- Streaming: real-time paced 50 ms chunks (1,600 bytes each)
- Java: 21.0.12
- Azure Speech SDK: 1.51.0
- Azure region and languages: `koreacentral`, `en-US` to `vi`
- PhraseList enabled: `true`
- PhraseList weight: `1.1`
- PhraseList terms, exactly:
  - `eigenstate`
  - `eigenvalue`
  - `eigenfunction`
  - `Hamiltonian`

The Run C values were supplied as process-only environment overrides; the user's `.env` was not modified. No plural expansion, sentence phrase, stable-partial setting, custom model, profanity setting, segmentation/silence tuning, post-correction, audio processing, retry, or second pass was used.

## Run C measurements

| Measurement | Result |
|---|---:|
| Session started | 1 ms wall time |
| First non-empty English partial | 2,337 ms wall; 1,017 ms estimated lag |
| First non-empty Vietnamese partial | 2,337 ms wall; 1,017 ms estimated lag |
| First useful Vietnamese partial | 3,479 ms wall; 1,129 ms estimated lag |
| P50 partial estimated lag | 764 ms |
| P90 partial estimated lag | 1,316 ms |
| P95 partial estimated lag | 1,578 ms |
| Maximum partial estimated lag | 1,578 ms |
| Mean partial estimated lag | 866.8 ms; secondary only because partials are correlated |
| Final result | 15,384 ms wall time |
| Final estimated lag | 1,554 ms |
| Final arrival after all audio was sent | 624 ms |
| Non-empty partials / finals | 18 / 1 |
| Audio actually sent | 14.760 seconds |

The first English and Vietnamese partials were `remember` and `nhớ`. Applying the same usefulness interpretation as Runs A and B, the first partial containing meaningful domain content was:

> Nhớ trạng thái riêng

It arrived at 3,479 ms wall time, with 3,500 ms of audio sent and recognized audio ending at 2,350 ms, for an estimated subtitle lag of 1,129 ms. The generic earlier `nhớ` fragment was not classified as useful.

Percentiles use the same nearest-rank method as Run B. Azure connected and stopped normally with `EndOfStream / NoError`; there was no cancellation error or native-library failure.

## A/B/C comparison

| Metric | Run A: no bias | Run B: broad/strong | Run C: narrow/weak |
|---|---:|---:|---:|
| PhraseList | Off | 10 terms | 4 canonical terms |
| Weight | N/A | 1.5 | 1.1 |
| First EN partial wall time | 2,185 ms | 2,550 ms | 2,337 ms |
| First EN partial lag | 865 ms | 1,230 ms | 1,017 ms |
| First VI partial wall time | 2,185 ms | 2,550 ms | 2,337 ms |
| First VI partial lag | 865 ms | 1,230 ms | 1,017 ms |
| First useful VI wall time | 3,466 ms | 3,132 ms | 3,479 ms |
| First useful VI lag | 1,116 ms | 972 ms | 1,129 ms |
| P50 partial lag | 865 ms | 905 ms | 764 ms |
| P90 partial lag | 1,345 ms | 1,576 ms | 1,316 ms |
| P95 partial lag | 1,752 ms | 1,635 ms | 1,578 ms |
| Maximum partial lag | 1,752 ms | 1,695 ms | 1,578 ms |
| Final wall time | 15,851 ms | 15,422 ms | 15,384 ms |
| Final lag | 2,021 ms | 1,592 ms | 1,554 ms |
| Final after last audio chunk | 1,091 ms | 662 ms | 624 ms |
| Partial count | 19 | 21 | 18 |
| Final count | 1 | 1 | 1 |
| Targeted `peculiar eigenvalues` | FAIL: `peculiar optimal values` | PASS term, with wider over-bias | PARTIAL: `peculiar eigenvalue` (singular) |
| Unsupported term repetitions | None | YES | No |
| Unsupported `eigenvalue` insertion before `eigenfunction` | No | YES | No |

Run A percentile values are taken from the existing Run B report, where they were calculated from the retained raw Run A partial-event lags. No unavailable measurement was reconstructed for this report.

Run C's first useful subtitle timing was essentially the same as Run A: 13 ms more estimated lag, while remaining below the approximate 1.2–1.3 second target. Run C had the best P50, P90, P95, maximum partial, and final lag of the three runs. As with all runs here, these are correlated events from one short sample rather than independent latency observations.

## Final transcripts

### Run A English

> Remember, eigen States and eigenvalues of matrices are peculiar numbers if you have a matrix or peculiar optimal values. So this equation is an eigenfunction equation.

### Run B English

> Remember eigenstates and eigenvalues, eigenvalues and eigenvalues. Eigenvalues of matrices are peculiar numbers if you have a matrix or peculiar eigenvalues. So this equation is an eigenvalue is an eigenfunction equation.

### Run C English

> Remember, eigen states, an eigenvalue of matrices are peculiar numbers if you have a matrix or peculiar eigenvalue. So this equation is an eigenfunction equation.

### Run A Vietnamese

> Hãy nhớ rằng, trạng thái riêng và giá trị riêng của ma trận là các số kỳ lạ nếu bạn có ma trận hoặc các giá trị tối ưu đặc biệt. Vì vậy, phương trình này là một phương trình hàm riêng.

### Run B Vietnamese

> Hãy nhớ các trạng thái riêng và giá trị riêng, giá trị riêng và giá trị riêng. Giá trị riêng của ma trận là số kỳ lạ nếu bạn có ma trận hoặc giá trị riêng kỳ lạ. Vì vậy, phương trình này là một giá trị riêng là một phương trình hàm riêng.

### Run C Vietnamese

> Hãy nhớ rằng, các trạng thái riêng, một giá trị riêng của ma trận là các số kỳ lạ nếu bạn có một ma trận hoặc giá trị riêng đặc biệt. Vì vậy, phương trình này là một phương trình hàm riêng.

## Accuracy questions

### 1. Did the singular glossary still produce the intended `eigenvalues`?

Not exactly. The Run A non-domain substitution `optimal values` did not return, but Run C produced `peculiar eigenvalue` in the singular rather than the spoken plural `peculiar eigenvalues`. The glossary therefore preserved the domain concept while losing number morphology. This is a partial improvement, not a clean ASR pass.

### 2. Did Run B's unsupported repetitions disappear?

Yes. Run C did not repeat `eigenvalues, eigenvalues and eigenvalues` or produce a comparable glossary-term sequence.

### 3. Did Run B's unsupported insertion disappear?

Yes. Run C returned `this equation is an eigenfunction equation` without inserting `an eigenvalue is` before it.

### 4. Were the actually spoken concepts recognized correctly?

| Concept | Run C ASR | Vietnamese | Evaluation |
|---|---|---|---|
| `eigenstates` | `eigen states` | `các trạng thái riêng` | Domain concept preserved; English compound split, as in Run A |
| `eigenvalue / eigenvalues` | `an eigenvalue`; `peculiar eigenvalue` | `một giá trị riêng`; `giá trị riêng đặc biệt` | Correct domain concept but incorrect singular morphology for spoken plurals |
| `eigenfunction` | `eigenfunction equation` | `phương trình hàm riêng` | Correct |
| `matrices` | `matrices` | `ma trận` | Correct |

No comparable unsupported physics concept was inserted in the final transcript. There was normal partial-result instability, including an early `remember eigenstate said eigenvalue`, but it did not survive into the final result or grow into Run B-style repetition.

## ASR versus translation

The material remaining errors are upstream ASR errors: splitting `eigen states`, changing plural `eigenvalues` to singular `eigenvalue`, and losing the conjunction in `eigenstates and eigenvalues`. Vietnamese generally followed that English faithfully. Its singular `một giá trị riêng` is therefore downstream of ASR, not an independent translation error.

When the English domain concepts were correct, Vietnamese rendered them reasonably: `trạng thái riêng`, `giá trị riêng`, `ma trận`, and `phương trình hàm riêng`. No separate material translation failure was observed in this sample.

## Verdict and architecture recommendation

**PROMISING** for the narrow low-bias configuration, with a morphology caveat.

Run C met the useful-subtitle latency target, prevented the Run A `optimal values` substitution from returning, removed Run B's material repetitions and unsupported insertion, and introduced no comparable final terminology hallucination. It did not produce exact plural morphology, so the result is not perfect; however, overall transcript fidelity was materially safer than Run B and domain semantics were more useful than Run A at comparable useful-subtitle latency.

**RECOMMEND_LOW_BIAS_PHRASELIST**

For the future live system, prefer a small canonical glossary used as weak domain context over both raw Azure and the broad weight-1.5 list. This recommendation is bounded to one 14.760-second physics sample and does not justify further PhraseList tuning loops during this spike.

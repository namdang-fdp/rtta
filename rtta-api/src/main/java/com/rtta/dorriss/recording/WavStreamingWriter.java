package com.rtta.dorriss.recording;

import java.io.IOException;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;

final class WavStreamingWriter implements AutoCloseable {

	static final int HEADER_SIZE = 44;
	private static final long MAX_DATA_BYTES = 0xffff_ffffL - 36;

	private final Path path;
	private final RandomAccessFile file;
	private final int sampleRate;
	private final short channels;
	private final short bitsPerSample;
	private long dataBytes;
	private boolean finalized;

	private WavStreamingWriter(
			Path path,
			RandomAccessFile file,
			int sampleRate,
			short channels,
			short bitsPerSample) throws IOException {
		this.path = path;
		this.file = file;
		this.sampleRate = sampleRate;
		this.channels = channels;
		this.bitsPerSample = bitsPerSample;
		writeHeader(0);
	}

	static WavStreamingWriter create(
			Path directory,
			int sampleRate,
			short channels,
			short bitsPerSample) throws IOException {
		Files.createDirectories(directory);
		Path path = Files.createTempFile(directory, "rtta-recording-", ".wav");
		try {
			return new WavStreamingWriter(
					path, new RandomAccessFile(path.toFile(), "rw"), sampleRate, channels, bitsPerSample);
		}
		catch (IOException | RuntimeException exception) {
			Files.deleteIfExists(path);
			throw exception;
		}
	}

	synchronized void append(byte[] pcm) throws IOException {
		if (finalized) throw new IOException("WAV recording is already finalized");
		if (dataBytes + pcm.length > MAX_DATA_BYTES) throw new IOException("WAV recording exceeds the V1 size limit");
		file.write(pcm);
		dataBytes += pcm.length;
	}

	synchronized WavResult finalizeFile() throws IOException {
		if (!finalized) {
			writeHeader(dataBytes);
			file.getFD().sync();
			file.close();
			finalized = true;
		}
		long bytesPerSecond = (long) sampleRate * channels * bitsPerSample / 8;
		long durationMs = bytesPerSecond == 0 ? 0 : dataBytes * 1_000 / bytesPerSecond;
		return new WavResult(path, HEADER_SIZE + dataBytes, dataBytes, durationMs);
	}

	Path path() {
		return path;
	}

	@Override
	public synchronized void close() throws IOException {
		if (!finalized) {
			file.close();
			finalized = true;
		}
	}

	private void writeHeader(long dataSize) throws IOException {
		file.seek(0);
		file.writeBytes("RIFF");
		writeLittleEndianInt(36 + dataSize);
		file.writeBytes("WAVE");
		file.writeBytes("fmt ");
		writeLittleEndianInt(16);
		writeLittleEndianShort(1);
		writeLittleEndianShort(channels);
		writeLittleEndianInt(sampleRate);
		long byteRate = (long) sampleRate * channels * bitsPerSample / 8;
		writeLittleEndianInt(byteRate);
		writeLittleEndianShort(channels * bitsPerSample / 8);
		writeLittleEndianShort(bitsPerSample);
		file.writeBytes("data");
		writeLittleEndianInt(dataSize);
		file.seek(HEADER_SIZE + dataBytes);
	}

	private void writeLittleEndianInt(long value) throws IOException {
		file.write((int) value & 0xff);
		file.write((int) (value >>> 8) & 0xff);
		file.write((int) (value >>> 16) & 0xff);
		file.write((int) (value >>> 24) & 0xff);
	}

	private void writeLittleEndianShort(int value) throws IOException {
		file.write(value & 0xff);
		file.write((value >>> 8) & 0xff);
	}

	record WavResult(Path path, long sizeBytes, long pcmBytes, long durationMs) {
	}
}

package com.rtta.dorriss.document;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.apache.poi.xslf.usermodel.XSLFShape;
import org.apache.poi.xslf.usermodel.XSLFTextShape;
import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.apache.tika.metadata.Metadata;
import org.springframework.stereotype.Component;

@Component
public class DocumentTextExtractor {

	private static final int MAX_EXTRACTED_CHARACTERS = 5_000_000;
	private final Tika tika = new Tika();

	public List<ExtractedSection> extract(Path file, String mediaType) throws Exception {
		return switch (mediaType) {
			case "application/pdf" -> extractPdf(file);
			case "application/vnd.openxmlformats-officedocument.presentationml.presentation" -> extractPptx(file);
			case "text/plain" -> List.of(section(limit(Files.readString(file, StandardCharsets.UTF_8)), Map.of()));
			default -> List.of(section(extractWithTika(file), Map.of()));
		};
	}

	public String detect(Path file, String suppliedName) throws Exception {
		try (InputStream input = Files.newInputStream(file)) {
			return tika.detect(input, suppliedName);
		}
	}

	private List<ExtractedSection> extractPdf(Path file) throws Exception {
		List<ExtractedSection> sections = new ArrayList<>();
		try (var document = Loader.loadPDF(file.toFile())) {
			PDFTextStripper stripper = new PDFTextStripper();
			for (int page = 1; page <= document.getNumberOfPages(); page++) {
				stripper.setStartPage(page);
				stripper.setEndPage(page);
				addNonBlank(sections, stripper.getText(document), Map.of("pageNumber", page));
			}
		}
		return sections;
	}

	private List<ExtractedSection> extractPptx(Path file) throws Exception {
		List<ExtractedSection> sections = new ArrayList<>();
		try (InputStream input = Files.newInputStream(file); XMLSlideShow slides = new XMLSlideShow(input)) {
			for (int index = 0; index < slides.getSlides().size(); index++) {
				StringBuilder text = new StringBuilder();
				for (XSLFShape shape : slides.getSlides().get(index).getShapes()) {
					if (shape instanceof XSLFTextShape textShape && !textShape.getText().isBlank()) {
						text.append(textShape.getText()).append("\n\n");
					}
				}
				addNonBlank(sections, text.toString(), Map.of("slideNumber", index + 1));
			}
		}
		return sections;
	}

	private String extractWithTika(Path file) throws Exception {
		try (InputStream input = Files.newInputStream(file)) {
			return limit(tika.parseToString(input, new Metadata(), MAX_EXTRACTED_CHARACTERS));
		}
		catch (TikaException exception) {
			throw new IllegalArgumentException("Document text extraction failed", exception);
		}
	}

	private void addNonBlank(List<ExtractedSection> sections, String content, Map<String, Object> metadata) {
		String cleaned = clean(content);
		if (!cleaned.isBlank()) sections.add(section(limit(cleaned), metadata));
	}

	private ExtractedSection section(String content, Map<String, Object> metadata) {
		return new ExtractedSection(clean(content), Map.copyOf(metadata));
	}

	private String clean(String content) {
		return content.replace('\u0000', ' ').replaceAll("[\\t ]+", " ").replaceAll("\\R{3,}", "\n\n").trim();
	}

	private String limit(String content) {
		return content.length() <= MAX_EXTRACTED_CHARACTERS
				? content
				: content.substring(0, MAX_EXTRACTED_CHARACTERS);
	}
}

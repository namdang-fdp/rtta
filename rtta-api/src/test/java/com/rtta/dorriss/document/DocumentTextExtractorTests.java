package com.rtta.dorriss.document;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Files;
import java.nio.file.Path;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.poi.xslf.usermodel.XMLSlideShow;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class DocumentTextExtractorTests {

	@TempDir Path tempDirectory;
	private final DocumentTextExtractor extractor = new DocumentTextExtractor();

	@Test
	void extractsPdfByPageWithCitationMetadata() throws Exception {
		Path pdf = tempDirectory.resolve("paper.pdf");
		try (PDDocument document = new PDDocument()) {
			for (String text : new String[] { "Hamiltonian page one", "Eigenstate page two" }) {
				PDPage page = new PDPage();
				document.addPage(page);
				try (PDPageContentStream content = new PDPageContentStream(document, page)) {
					content.beginText();
					content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
					content.newLineAtOffset(50, 700);
					content.showText(text);
					content.endText();
				}
			}
			document.save(pdf.toFile());
		}

		var sections = extractor.extract(pdf, "application/pdf");

		assertThat(sections).hasSize(2);
		assertThat(sections.getFirst().content()).contains("Hamiltonian page one");
		assertThat(sections.getFirst().metadata()).containsEntry("pageNumber", 1);
		assertThat(sections.getLast().metadata()).containsEntry("pageNumber", 2);
	}

	@Test
	void extractsPptxBySlideWithCitationMetadata() throws Exception {
		Path pptx = tempDirectory.resolve("slides.pptx");
		try (XMLSlideShow slides = new XMLSlideShow()) {
			slides.createSlide().createTextBox().setText("Quantum coherence");
			slides.createSlide().createTextBox().setText("Thermal isolation");
			try (var output = Files.newOutputStream(pptx)) { slides.write(output); }
		}

		var sections = extractor.extract(
				pptx, "application/vnd.openxmlformats-officedocument.presentationml.presentation");

		assertThat(sections).hasSize(2);
		assertThat(sections.getFirst().content()).contains("Quantum coherence");
		assertThat(sections.getLast().metadata()).containsEntry("slideNumber", 2);
	}
}

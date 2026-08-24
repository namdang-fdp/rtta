package com.rtta.dorriss.summary;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.rtta.dorriss.ai.AiProviderException;
import org.junit.jupiter.api.Test;

class SummaryOutputPolicyTests {

	private final SummaryOutputPolicy policy = new SummaryOutputPolicy();

	@Test
	void acceptsResearchUnderstandingSections() {
		assertThat(policy.requireResearchSummary("# Tóm tắt\n\nNội dung"))
				.isEqualTo("# Tóm tắt\n\nNội dung");
	}

	@Test
	void rejectsActionItemSectionsInEnglishOrVietnamese() {
		assertThatThrownBy(() -> policy.requireResearchSummary("# Tóm tắt\nX\n## Action Items\n- do it"))
				.isInstanceOf(AiProviderException.class);
		assertThatThrownBy(() -> policy.requireResearchSummary("# Việc cần làm\n- làm ngay"))
				.isInstanceOf(AiProviderException.class);
	}
}

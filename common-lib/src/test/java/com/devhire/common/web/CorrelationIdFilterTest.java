package com.devhire.common.web;

import com.devhire.common.constants.AppHeaders;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class CorrelationIdFilterTest {
    private final CorrelationIdFilter filter = new CorrelationIdFilter();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    @Test
    void preservesIncomingCorrelationIdAndClearsMdcAfterRequest() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/jobs");
        request.addHeader(AppHeaders.CORRELATION_ID, "trace-existing");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(AppHeaders.CORRELATION_ID)).isEqualTo("trace-existing");
        assertThat(chain.traceIdDuringFilter).isEqualTo("trace-existing");
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }

    @Test
    void generatesCorrelationIdWhenMissing() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/jobs");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(AppHeaders.CORRELATION_ID)).isNotBlank();
        assertThat(chain.traceIdDuringFilter).isEqualTo(response.getHeader(AppHeaders.CORRELATION_ID));
        assertThat(MDC.get(CorrelationIdFilter.MDC_KEY)).isNull();
    }

    @Test
    void generatesCorrelationIdWhenHeaderIsBlank() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/jobs");
        request.addHeader(AppHeaders.CORRELATION_ID, "  ");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getHeader(AppHeaders.CORRELATION_ID)).isNotBlank();
        assertThat(response.getHeader(AppHeaders.CORRELATION_ID)).isNotEqualTo("  ");
        assertThat(chain.traceIdDuringFilter).isEqualTo(response.getHeader(AppHeaders.CORRELATION_ID));
    }

    private static final class CapturingFilterChain extends MockFilterChain {
        private String traceIdDuringFilter;

        @Override
        public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
            this.traceIdDuringFilter = MDC.get(CorrelationIdFilter.MDC_KEY);
        }
    }
}

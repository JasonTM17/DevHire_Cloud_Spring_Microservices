package com.devhire.common.web;

import com.devhire.common.constants.AppHeaders;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class GatewayInternalTokenFilterTest {
    @Test
    void rejectsIdentitySpoofWithoutGatewayToken() throws Exception {
        GatewayInternalTokenFilter filter = new GatewayInternalTokenFilter("shared-boundary-token");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/candidate/code-assessments");
        request.addHeader(AppHeaders.USER_ID, "22222222-2222-2222-2222-222222222222");
        request.addHeader(AppHeaders.USER_EMAIL, "candidate@devhire.local");
        request.addHeader(AppHeaders.USER_ROLE, "ADMIN");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(chain.called).isFalse();
    }

    @Test
    void rejectsInternalRouteWithoutGatewayToken() throws Exception {
        GatewayInternalTokenFilter filter = new GatewayInternalTokenFilter("shared-boundary-token");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/internal/assessment-runs");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(chain.called).isFalse();
    }

    @Test
    void rejectsProtectedRoutesWhenGatewayTokenIsNotConfigured() throws Exception {
        GatewayInternalTokenFilter filter = new GatewayInternalTokenFilter("");
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/internal/assessment-runs");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(chain.called).isFalse();
    }

    @Test
    void allowsIdentityBearingRequestWithGatewayToken() throws Exception {
        GatewayInternalTokenFilter filter = new GatewayInternalTokenFilter("shared-boundary-token");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/candidate/code-assessments");
        request.addHeader(AppHeaders.USER_ID, "22222222-2222-2222-2222-222222222222");
        request.addHeader(AppHeaders.USER_EMAIL, "candidate@devhire.local");
        request.addHeader(AppHeaders.USER_ROLE, "CANDIDATE");
        request.addHeader(AppHeaders.INTERNAL_GATEWAY_TOKEN, "shared-boundary-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.called).isTrue();
    }

    @Test
    void allowsInternalRouteWithGatewayToken() throws Exception {
        GatewayInternalTokenFilter filter = new GatewayInternalTokenFilter("shared-boundary-token");
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/internal/jobs/11111111-1111-1111-1111-111111111111");
        request.addHeader(AppHeaders.INTERNAL_GATEWAY_TOKEN, "shared-boundary-token");
        MockHttpServletResponse response = new MockHttpServletResponse();
        CapturingFilterChain chain = new CapturingFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(chain.called).isTrue();
    }

    @Test
    void leavesHealthAndPublicReadRoutesAvailable() throws Exception {
        GatewayInternalTokenFilter filter = new GatewayInternalTokenFilter("shared-boundary-token");
        MockHttpServletResponse healthResponse = new MockHttpServletResponse();
        CapturingFilterChain healthChain = new CapturingFilterChain();
        filter.doFilter(new MockHttpServletRequest("GET", "/actuator/health/readiness"), healthResponse, healthChain);

        MockHttpServletResponse publicResponse = new MockHttpServletResponse();
        CapturingFilterChain publicChain = new CapturingFilterChain();
        filter.doFilter(new MockHttpServletRequest("GET", "/jobs"), publicResponse, publicChain);

        assertThat(healthChain.called).isTrue();
        assertThat(publicChain.called).isTrue();
    }

    private static final class CapturingFilterChain extends MockFilterChain {
        private boolean called;

        @Override
        public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
            this.called = true;
        }
    }
}

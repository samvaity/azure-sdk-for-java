// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.generic.core.http.policy.logging;

import com.generic.core.http.NoOpHttpClient;
import com.generic.core.http.models.HttpHeaderName;
import com.generic.core.http.models.HttpMethod;
import com.generic.core.http.models.HttpRequest;
import com.generic.core.http.models.HttpResponse;
import com.generic.core.http.pipeline.HttpPipeline;
import com.generic.core.http.pipeline.HttpPipelineBuilder;
import com.generic.core.implementation.AccessibleByteArrayOutputStream;
import com.generic.core.implementation.http.ContentType;
import com.generic.core.implementation.http.policy.logging.HttpLoggingPolicy;
import com.generic.core.implementation.http.policy.retry.RetryPolicy;
import com.generic.core.implementation.util.EnvironmentConfiguration;
import com.generic.core.models.BinaryData;
import com.generic.core.models.Context;
import com.generic.core.models.Header;
import com.generic.core.models.Headers;
import com.generic.core.util.logging.LogLevel;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.parallel.Execution;
import org.junit.jupiter.api.parallel.ExecutionMode;
import org.junit.jupiter.api.parallel.Isolated;
import org.junit.jupiter.api.parallel.ResourceLock;
import org.junit.jupiter.api.parallel.Resources;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;

import java.io.ByteArrayInputStream;
import java.io.PrintStream;
import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static com.generic.core.CoreTestUtils.assertArraysEqual;
import static com.generic.core.CoreTestUtils.createUrl;
import static com.generic.core.util.configuration.Configuration.PROPERTY_LOG_LEVEL;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;

/**
 * This class contains tests for {@link com.generic.core.implementation.http.policy.logging.HttpLoggingPolicy}.
 */
@Execution(ExecutionMode.SAME_THREAD)
@Isolated
@ResourceLock(Resources.SYSTEM_OUT)
public class HttpLoggingPolicyTests {
    private static final String REDACTED = "REDACTED";
    private static final HttpHeaderName X_MS_REQUEST_ID = HttpHeaderName.fromString("x-ms-request-id");

    private static String initialLogLevel;
    private static PrintStream originalSystemOut;

    private AccessibleByteArrayOutputStream logCaptureStream;

    @BeforeAll
    public static void captureInitialLogLevel() {
        initialLogLevel = EnvironmentConfiguration.getGlobalConfiguration().get(PROPERTY_LOG_LEVEL);
        originalSystemOut = System.out;
    }

    @AfterAll
    public static void resetInitialLogLevel() {
        if (initialLogLevel == null) {
            EnvironmentConfiguration.getGlobalConfiguration().remove(PROPERTY_LOG_LEVEL);
        } else {
            EnvironmentConfiguration.getGlobalConfiguration().put(PROPERTY_LOG_LEVEL, initialLogLevel);
        }

        System.setOut(originalSystemOut);
    }

    @BeforeEach
    public void prepareForTest() {
        // Set the log level to information for the test.
        setupLogLevel(LogLevel.INFORMATIONAL.getLogLevel());

        /*
         * DefaultLogger uses System.out to log. Inject a custom PrintStream to log into for the duration of the test to
         * capture the log messages.
         */
        logCaptureStream = new AccessibleByteArrayOutputStream();
        System.setOut(new PrintStream(logCaptureStream));
    }

    @AfterEach
    public void cleanupAfterTest() {
        // Reset or clear the log level after the test completes.
        clearTestLogLevel();
    }

    /**
     * Tests that a query string will be properly redacted before it is logged.
     */
    @ParameterizedTest
    @MethodSource("redactQueryParametersSupplier")
    public void redactQueryParameters(String requestUrl, String expectedQueryString,
                                          Set<String> allowedQueryParameters) {
        HttpPipeline pipeline = new HttpPipelineBuilder()
            .policies(new HttpLoggingPolicy(new HttpLogOptions()
                .setLogLevel(HttpLogDetailLevel.BASIC)
                .setAllowedQueryParamNames(allowedQueryParameters)))
            .httpClient(new NoOpHttpClient())
            .build();

        pipeline.send(new HttpRequest(HttpMethod.POST, requestUrl),
            getCallerMethodContext("redactQueryParametersSync"));

        assertTrue(convertOutputStreamToString(logCaptureStream).contains(expectedQueryString));
    }

    private static Stream<Arguments> redactQueryParametersSupplier() {
        String requestUrl = "https://localhost?sensitiveQueryParameter=sensitiveValue&queryParameter=value";

        String expectedFormat = "sensitiveQueryParameter=%s&queryParameter=%s";
        String fullyRedactedQueryString = String.format(expectedFormat, REDACTED, REDACTED);
        String sensitiveRedactionQueryString = String.format(expectedFormat, REDACTED, "value");
        String fullyAllowedQueryString = String.format(expectedFormat, "sensitiveValue", "value");

        Set<String> allQueryParameters = new HashSet<>();
        allQueryParameters.add("sensitiveQueryParameter");
        allQueryParameters.add("queryParameter");

        return Stream.of(
            // All query parameters should be redacted.
            Arguments.of(requestUrl, fullyRedactedQueryString, new HashSet<String>()),

            // Only the sensitive query parameter should be redacted.
            Arguments.of(requestUrl, sensitiveRedactionQueryString, Collections.singleton("queryParameter")),

            // No query parameters are redacted.
            Arguments.of(requestUrl, fullyAllowedQueryString, allQueryParameters)
        );
    }

    /**
     * Tests that logging the request body doesn't consume the stream before it is sent over the network.
     */
    @ParameterizedTest(name = "[{index}] {displayName}")
    @MethodSource("validateLoggingDoesNotConsumeSupplierSync")
    @Execution(ExecutionMode.SAME_THREAD)
    public void validateLoggingDoesNotConsumeRequestSync(BinaryData requestBody, byte[] data, int contentLength)
        throws MalformedURLException {
        String url = "https://test.com/validateLoggingDoesNotConsumeRequestSync";
        Headers requestHeaders = new Headers()
            .set(HttpHeaderName.CONTENT_TYPE, ContentType.APPLICATION_JSON)
            .set(HttpHeaderName.CONTENT_LENGTH, Integer.toString(contentLength));

        HttpPipeline pipeline = new HttpPipelineBuilder()
            .policies(new HttpLoggingPolicy(new HttpLogOptions().setLogLevel(HttpLogDetailLevel.BODY)))
            .httpClient((request, context) -> {
                    assertNotNull(request.getBody());
                    assertArraysEqual(data, requestBody.toBytes());
                    return null;
            })
            .build();

        pipeline.send(new HttpRequest(HttpMethod.POST, createUrl(url), requestHeaders, requestBody),
            getCallerMethodContext("validateLoggingDoesNotConsumeRequestSync"));

        String logString = convertOutputStreamToString(logCaptureStream);
        List<HttpLogMessage> messages = HttpLogMessage.fromString(logString);
        assertEquals(1, messages.size());

        HttpLogMessage expectedRequest = HttpLogMessage.request(HttpMethod.POST, url, data);
        expectedRequest.assertEqual(messages.get(0), HttpLogDetailLevel.BODY, LogLevel.INFORMATIONAL);
    }

    /**
     * Tests that logging the response body doesn't consume the stream before it is returned from the service call.
     */
    @ParameterizedTest(name = "[{index}] {displayName}")
    @MethodSource("validateLoggingDoesNotConsumeSupplierSync")
    public void validateLoggingDoesNotConsumeResponseSync(BinaryData responseBody, byte[] data, int contentLength) {
        HttpRequest request = new HttpRequest(HttpMethod.GET, "https://test./validateLoggingDoesNotConsumeResponseSync");
        Headers responseHeaders = new Headers()
            .set(HttpHeaderName.CONTENT_TYPE, ContentType.APPLICATION_JSON)
            .set(HttpHeaderName.CONTENT_LENGTH, Integer.toString(contentLength));

        HttpPipeline pipeline = new HttpPipelineBuilder()
            .policies(new HttpLoggingPolicy(new HttpLogOptions().setLogLevel(HttpLogDetailLevel.BODY)))
            .httpClient((ignored, context) -> new MockHttpResponse(ignored, responseHeaders, responseBody))
            .build();

        try (HttpResponse response = pipeline.send(request,
            getCallerMethodContext("validateLoggingDoesNotConsumeResponseSync"))) {
            assertArraysEqual(data, response.getBody().toBytes());
        }

        String logString = convertOutputStreamToString(logCaptureStream);
        assertTrue(logString.contains(new String(data, StandardCharsets.UTF_8)));
    }

    private static Stream<Arguments> validateLoggingDoesNotConsumeSupplierSync() {
        byte[] data = "this is a test".getBytes(StandardCharsets.UTF_8);

        return Stream.of(
            Arguments.of(BinaryData.fromBytes(data), data, data.length),

            Arguments.of(BinaryData.fromStream(new ByteArrayInputStream(data), (long) data.length), data, data.length)
        );
    }
    private static class MockHttpResponse extends HttpResponse {
        private final Headers headers;
        private final BinaryData body;

        MockHttpResponse(HttpRequest request, Headers headers, BinaryData body) {
            super(request);
            this.headers = headers;
            this.body = body;
        }

        @Override
        public int getStatusCode() {
            return 200;
        }


        @Override
        public String getHeaderValue(HttpHeaderName headerName) {
            return headers.getValue(headerName);
        }

        @Override
        public Headers getHeaders() {
            return headers;
        }

        @Override
        public BinaryData getBody() {
            return body;
        }
    }

    @ParameterizedTest(name = "[{index}] {displayName}")
    @EnumSource(value = HttpLogDetailLevel.class, mode = EnumSource.Mode.INCLUDE,
        names = {"BASIC", "HEADERS", "BODY", "BODY_AND_HEADERS"})
    public void loggingHeadersAndBodyVerbose(HttpLogDetailLevel logLevel) {
        setupLogLevel(LogLevel.VERBOSE.getLogLevel());
        byte[] requestBody = new byte[] {42};
        byte[] responseBody = new byte[] {24, 42};
        String url = "https://test.com/loggingHeadersAndBodyVerbose/" + logLevel;
        HttpRequest request = new HttpRequest(HttpMethod.POST, url)
            .setBody(requestBody)
            .setHeader(HttpHeaderName.CLIENT_REQUEST_ID, "client-request-id");

        Headers responseHeaders = new Headers()
            .set(HttpHeaderName.CONTENT_LENGTH, Integer.toString(responseBody.length))
            .set(X_MS_REQUEST_ID, "server-request-id");

        HttpPipeline pipeline = new HttpPipelineBuilder()
            .policies(new RetryPolicy(), new HttpLoggingPolicy(new HttpLogOptions().setLogLevel(logLevel)))
            .httpClient((r, c) -> new MockHttpResponse(r, responseHeaders, BinaryData.fromBytes(responseBody)))
            .build();

        HttpLogMessage expectedRequest = HttpLogMessage.request(HttpMethod.POST, url, requestBody)
            .setHeaders(request.getHeaders())
            .setTryCount(1);
        HttpLogMessage expectedResponse = HttpLogMessage.response(url, responseBody, 200)
            .setHeaders(responseHeaders);

        HttpResponse response = pipeline.send(request, getCallerMethodContext("loggingHeadersAndBodyVerbose"));
        assertArraysEqual(responseBody, response.getBody().toBytes());

        String logString = convertOutputStreamToString(logCaptureStream);

        List<HttpLogMessage> messages = HttpLogMessage.fromString(logString);
        assertEquals(2, messages.size());

        expectedRequest.assertEqual(messages.get(0), logLevel, LogLevel.VERBOSE);
        expectedResponse.assertEqual(messages.get(1), logLevel, LogLevel.VERBOSE);
    }

    @ParameterizedTest(name = "[{index}] {displayName}")
    @EnumSource(value = HttpLogDetailLevel.class, mode = EnumSource.Mode.INCLUDE,
        names = {"BASIC", "HEADERS", "BODY", "BODY_AND_HEADERS"})
    public void loggingIncludesRetryCountSync(HttpLogDetailLevel logLevel) {
        AtomicInteger requestCount = new AtomicInteger();
        String url = "https://test.com/loggingIncludesRetryCountSync/" + logLevel;
        HttpRequest request = new HttpRequest(HttpMethod.GET, url)
            .setHeader(HttpHeaderName.CLIENT_REQUEST_ID, "client-request-id");

        byte[] responseBody = new byte[] {24, 42};
        Headers responseHeaders = new Headers()
            .set(HttpHeaderName.CONTENT_LENGTH, Integer.toString(responseBody.length))
            .set(X_MS_REQUEST_ID, "server-request-id");

        HttpPipeline pipeline = new HttpPipelineBuilder()
            .policies(new RetryPolicy(), new HttpLoggingPolicy(new HttpLogOptions().setLogLevel(logLevel)))
            .httpClient((ignored, context) -> (requestCount.getAndIncrement() == 0)
                ? null
                : new MockHttpResponse(ignored, responseHeaders, BinaryData.fromBytes(responseBody)))
            .build();

        HttpLogMessage expectedRetry1 = HttpLogMessage.request(HttpMethod.GET, url, null)
            .setTryCount(1)
            .setHeaders(request.getHeaders());
        HttpLogMessage expectedRetry2 = HttpLogMessage.request(HttpMethod.GET, url, null)
            .setTryCount(2)
            .setHeaders(request.getHeaders());
        HttpLogMessage expectedResponse = HttpLogMessage.response(url, responseBody, 200)
            .setHeaders(responseHeaders);

        try (HttpResponse response = pipeline.send(request,
            getCallerMethodContext("loggingIncludesRetryCountSync"))) {
            BinaryData content = response.getBody();
            assertEquals(2, requestCount.get());
            String logString = convertOutputStreamToString(logCaptureStream);

            // if HttpLoggingPolicy logger was created when verbose was enabled,
            // there is no way to change it.
            List<HttpLogMessage> messages = HttpLogMessage.fromString(logString).stream()
                .filter(m -> !m.getMessage().equals("Error resume.")).collect(Collectors.toList());

            assertEquals(3, messages.size(), logString);

            expectedRetry1.assertEqual(messages.get(0), logLevel, LogLevel.INFORMATIONAL);
            expectedRetry2.assertEqual(messages.get(1), logLevel, LogLevel.INFORMATIONAL);
            expectedResponse.assertEqual(messages.get(2), logLevel, LogLevel.INFORMATIONAL);

            assertArraysEqual(responseBody, content.toBytes());
        }
    }

    @ParameterizedTest(name = "[{index}] {displayName}")
    @EnumSource(value = HttpLogDetailLevel.class, mode = EnumSource.Mode.INCLUDE,
        names = {"BASIC", "HEADERS", "BODY", "BODY_AND_HEADERS"})
    public void loggingHeadersAndBodyVerboseSync(HttpLogDetailLevel logLevel) {
        setupLogLevel(LogLevel.VERBOSE.getLogLevel());
        byte[] requestBody = new byte[] {42};
        byte[] responseBody = new byte[] {24, 42};
        String url = "https://test.com/loggingHeadersAndBodyVerboseSync/" + logLevel;
        HttpRequest request = new HttpRequest(HttpMethod.POST, url)
            .setBody(requestBody)
            .setHeader(HttpHeaderName.CLIENT_REQUEST_ID, "client-request-id");

        Headers responseHeaders = new Headers()
            .set(HttpHeaderName.CONTENT_LENGTH, Integer.toString(responseBody.length))
            .set(X_MS_REQUEST_ID, "server-request-id");

        HttpPipeline pipeline = new HttpPipelineBuilder()
            .policies(new RetryPolicy(), new HttpLoggingPolicy(new HttpLogOptions().setLogLevel(logLevel)))
            .httpClient((r, c) -> new MockHttpResponse(r, responseHeaders, BinaryData.fromBytes(responseBody)))
            .build();

        HttpLogMessage expectedRequest = HttpLogMessage.request(HttpMethod.POST, url, requestBody)
            .setHeaders(request.getHeaders())
            .setTryCount(1);
        HttpLogMessage expectedResponse = HttpLogMessage.response(url, responseBody, 200)
            .setHeaders(responseHeaders);

        try (HttpResponse response = pipeline.send(request,
            getCallerMethodContext("loggingHeadersAndBodyVerboseSync"))) {
            assertArraysEqual(responseBody, response.getBody().toBytes());

            String logString = convertOutputStreamToString(logCaptureStream);

            // if HttpLoggingPolicy logger was created when verbose was enabled,
            // there is no way to change it.
            List<HttpLogMessage> messages = HttpLogMessage.fromString(logString).stream()
                .filter(m -> !m.getMessage().equals("Error resume.")).collect(Collectors.toList());

            assertEquals(2, messages.size(), logString);

            expectedRequest.assertEqual(messages.get(0), logLevel, LogLevel.VERBOSE);
            expectedResponse.assertEqual(messages.get(1), logLevel, LogLevel.VERBOSE);
        }
    }

    private static Context getCallerMethodContext(String testMethodName) {
        return new Context("caller-method", HttpLoggingPolicyTests.class.getName() + "." + testMethodName);
    }

    private void setupLogLevel(int logLevelToSet) {
        EnvironmentConfiguration.getGlobalConfiguration().put(PROPERTY_LOG_LEVEL, String.valueOf(logLevelToSet));
    }

    private void clearTestLogLevel() {
        EnvironmentConfiguration.getGlobalConfiguration().remove(PROPERTY_LOG_LEVEL);
    }

    private static String convertOutputStreamToString(AccessibleByteArrayOutputStream stream) {
        return stream.toString(StandardCharsets.UTF_8);
    }

    public static class HttpLogMessage {
        private static final ObjectMapper SERIALIZER =
            new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, true);
        private static final Integer MAGIC_NUMBER = 42;

        @JsonProperty("az.sdk.message")
        private String message;

        @JsonProperty("method")
        private String method;

        @JsonProperty("url")
        private String url;

        @JsonProperty("contentLength")
        private Integer contentLength;

        @JsonProperty("body")
        private String body;

        @JsonProperty("tryCount")
        private Integer tryCount;

        @JsonProperty("statusCode")
        private Integer statusCode;

        @JsonProperty("durationMs")
        private Integer durationMs;

        private final Map<String, String> headers = new HashMap<>();

        public HttpLogMessage() {
        }

        private static HttpLogMessage request(HttpMethod method, String url, byte[] body) {
            return new HttpLogMessage()
                .setMessage("HTTP request")
                .setMethod(method.toString())
                .setUrl(url)
                .setBody(body != null ? new String(body, StandardCharsets.UTF_8) : null)
                .setContentLength(body == null ? 0 : body.length);
        }

        private static HttpLogMessage response(String url, byte[] body, Integer statusCode) {
            return new HttpLogMessage()
                .setMessage("HTTP response")
                .setUrl(url)
                .setStatusCode(statusCode)
                .setDurationMs(MAGIC_NUMBER)
                .setBody(body != null ? new String(body, StandardCharsets.UTF_8) : null)
                .setContentLength(body == null ? 0 : body.length);
        }


        public HttpLogMessage setMessage(String message) {
            this.message = message;
            return this;
        }

        public String getMessage() {
            return message;
        }

        public HttpLogMessage setMethod(String method) {
            this.method = method;
            return this;
        }

        public String getMethod() {
            return method;
        }

        public HttpLogMessage setUrl(String url) {
            this.url = url;
            return this;
        }

        public String getUrl() {
            return url;
        }

        public HttpLogMessage setContentLength(Integer contentLength) {
            this.contentLength = contentLength;
            return this;
        }

        public Integer getContentLength() {
            return contentLength;
        }

        public HttpLogMessage setTryCount(Integer tryCount) {
            this.tryCount = tryCount;
            return this;
        }

        public Integer getTryCount() {
            return tryCount;
        }

        public HttpLogMessage setStatusCode(Integer statusCode) {
            this.statusCode = statusCode;
            return this;
        }

        public Integer getStatusCode() {
            return statusCode;
        }

        public HttpLogMessage setDurationMs(Integer durationMs) {
            this.durationMs = durationMs;
            return this;
        }

        public Integer getDurationMs() {
            return durationMs;
        }

        public HttpLogMessage setBody(String body) {
            this.body = body;
            return this;
        }

        public String getBody() {
            return body;
        }

        @JsonAnyGetter
        public Map<String, String> getHeaders() {
            return headers;
        }

        @JsonAnySetter
        public HttpLogMessage addHeader(String name, String value) {
            headers.put(name, value);
            return this;
        }

        public HttpLogMessage setHeaders(Headers headers) {
            for (Header h : headers) {
                this.headers.put(h.getName(), h.getValue());
            }

            return this;
        }

        public static List<HttpLogMessage> fromString(String logRecord) {

            List<HttpLogMessage> messages = new ArrayList<>();

            int start = logRecord.indexOf("{\"az.sdk.message\"");
            for (; start >= 0; start = logRecord.indexOf("{\"az.sdk.message\"", start + 1)) {
                String msg = logRecord.substring(start, logRecord.lastIndexOf("}") + 1);
                try {
                    messages.add(SERIALIZER.readValue(msg, HttpLogMessage.class));
                } catch (JsonMappingException ex) {
                    ex.printStackTrace();
                } catch (Exception ex) {
                    fail(ex);
                }
            }

            return messages;
        }

        void assertEqual(HttpLogMessage other, HttpLogDetailLevel httpLevel, LogLevel logLevel) {
            assertEquals(this.message, other.message);
            assertEquals(this.method, other.method);
            assertEquals(this.url, other.url);
            assertEquals(this.contentLength, other.contentLength);
            assertEquals(this.tryCount, other.tryCount);
            assertEquals(this.statusCode, other.statusCode);
            if (this.durationMs != null) {
                assertNotNull(other.durationMs);
            }

            if (httpLevel.shouldLogBody()) {
                assertEquals(this.body, other.body);
            }

            if (httpLevel.shouldLogHeaders() && logLevel == LogLevel.VERBOSE) {
                assertEquals(this.headers.size(), other.headers.size());

                for (Map.Entry<String, String> kvp : this.headers.entrySet()) {
                    assertEquals(kvp.getValue(), other.headers.get(kvp.getKey()));
                }
            }
        }


    }
}

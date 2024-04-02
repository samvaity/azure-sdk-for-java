// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.sdk.template.stress;

import com.azure.perf.test.core.PerfStressOptions;
import com.azure.sdk.template.stress.util.TelemetryHelper;
import com.generic.core.http.models.HttpHeaderName;
import com.generic.core.http.models.HttpLogOptions;
import com.generic.core.http.models.HttpMethod;
import com.generic.core.http.models.HttpRequest;
import com.generic.core.http.models.Response;
import com.generic.core.http.okhttp.OkHttpHttpClientProvider;
import com.generic.core.http.pipeline.HttpLoggingPolicy;
import com.generic.core.http.pipeline.HttpPipeline;
import com.generic.core.http.pipeline.HttpPipelineBuilder;
import com.generic.core.http.pipeline.HttpPipelinePolicy;
import com.generic.core.http.pipeline.HttpRetryPolicy;
import com.generic.core.util.ClientLogger;
import com.generic.core.util.binarydata.BinaryData;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.URL;
import java.time.Instant;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Performance test for simple HTTP GET against test server.
 */
public class HttpPatch extends ScenarioBase<StressOptions> {
    // there will be multiple instances of scenario
    private static final TelemetryHelper TELEMETRY_HELPER = new TelemetryHelper(HttpPatch.class);
    private static final ClientLogger LOGGER = new ClientLogger(HttpPatch.class);
    private final HttpPipeline pipeline;
    private final URL url;


    // This is almost-unique-id generator. We could use UUID, but it's a bit more expensive to use.
    private final AtomicLong clientRequestId = new AtomicLong(Instant.now().getEpochSecond());

    /**
     * Creates an instance of performance test.
     * @param options stress test options
     */
    public HttpPatch(StressOptions options) {
        super(options, TELEMETRY_HELPER);
        pipeline = getPipelineBuilder().build();
        try {
            url = new URL(options.getServiceEndpoint());
        } catch (MalformedURLException ex) {
            throw LOGGER.logThrowableAsError(new IllegalArgumentException("'url' must be a valid URL.", ex));
        }
    }

    @Override
    public void run() {
        TELEMETRY_HELPER.instrumentRun(this::runInternal);
    }

    private void runInternal() {
        // no need to handle exceptions here, they will be handled (and recorded) by the telemetry helper
        try (Response<?> response = pipeline.send(createRequest())) {
            int responseCode = response.getStatusCode();
            assert responseCode == 200;
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public Mono<Void> runAsync() {
        return Mono.error(new UnsupportedOperationException("Not implemented"));
    }

    private HttpRequest createRequest() {
        String body = "{\"test\":\"value\"}";
        HttpRequest request = new HttpRequest(HttpMethod.PATCH, url).setBody(BinaryData.fromString(body));

        request.getHeaders().set(HttpHeaderName.USER_AGENT, "azsdk-java-stress");
        request.getHeaders().set(HttpHeaderName.fromString("x-client-id"), String.valueOf(clientRequestId.incrementAndGet()));
        request.getHeaders().set(HttpHeaderName.CONTENT_TYPE, "application/json");
        request.getHeaders().set(HttpHeaderName.fromString("response-length"), "128");
        request.getHeaders().set(HttpHeaderName.fromString("X-HTTP-Method-Override"), "PATCH");
        return request;
    }

    private HttpPipelineBuilder getPipelineBuilder() {
        HttpLogOptions logOptions = new HttpLogOptions()
            .setLogLevel(HttpLogOptions.HttpLogDetailLevel.HEADERS);

        ArrayList<HttpPipelinePolicy> policies = new ArrayList<>();

        policies.add(new HttpRetryPolicy());
        policies.add(new HttpLoggingPolicy(logOptions));

        HttpPipelineBuilder builder = new HttpPipelineBuilder()
            .policies(policies.toArray(new HttpPipelinePolicy[0]));
        if (options.getHttpClient() == PerfStressOptions.HttpClientType.OKHTTP) {
            builder.httpClient(new OkHttpHttpClientProvider().createInstance());
        }
        return builder;
    }
}

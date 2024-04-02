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
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Performance test for simple HTTP GET against test server.
 */
public class HttpDownload extends ScenarioBase<StressOptions> {
    // there will be multiple instances of scenario
    private static final TelemetryHelper TELEMETRY_HELPER = new TelemetryHelper(HttpPatch.class);
    private static final ClientLogger LOGGER = new ClientLogger(HttpPatch.class);
    private final HttpPipeline pipeline;

    // This is almost-unique-id generator. We could use UUID, but it's a bit more expensive to use.
    private final AtomicLong clientRequestId = new AtomicLong(Instant.now().getEpochSecond());

    /**
     * Creates an instance of performance test.
     * @param options stress test options
     */
    public HttpDownload(StressOptions options) {
        super(options, TELEMETRY_HELPER);
        pipeline = getPipelineBuilder().build();
    }

    @Override
    public void run() {
        TELEMETRY_HELPER.instrumentRun(this::runInternal);
    }

    private void runInternal() {
        // no need to handle exceptions here, they will be handled (and recorded) by the telemetry helper
        try (Response<?> response = pipeline.send(createRequest())) {
            byte[] fileData = response.getBody().toBytes();
            LOGGER.atInfo().log(String.format("Downloaded file of size: {%s}", fileData.length));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    public Mono<Void> runAsync() {
        return Mono.error(new UnsupportedOperationException("Not implemented"));
    }

    private HttpRequest createRequest() {
        String receiptUrl = "https://raw.githubusercontent.com/Azure/azure-sdk-for-java/main/sdk/formrecognizer"
            + "/azure-ai-formrecognizer/src/samples/resources/sample-forms/receipts/contoso-allinone.jpg";
        HttpRequest request = new HttpRequest(HttpMethod.GET, receiptUrl);
        request.getHeaders().set(HttpHeaderName.USER_AGENT, "azsdk-java-stress");
        request.getHeaders().set(HttpHeaderName.fromString("x-client-id"), String.valueOf(clientRequestId.incrementAndGet()));
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

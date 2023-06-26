// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.communication.callautomation;

import com.azure.communication.identity.CommunicationIdentityClientBuilder;
import com.azure.core.credential.AccessToken;
import com.azure.core.credential.TokenCredential;
import com.azure.core.credential.TokenRequestContext;
import com.azure.core.http.HttpClient;
import com.azure.core.http.HttpPipelineNextPolicy;
import com.azure.core.http.HttpResponse;
import com.azure.core.test.TestBase;
import com.azure.core.test.TestMode;
import com.azure.core.test.TestProxyTestBase;
import com.azure.core.test.models.TestProxySanitizer;
import com.azure.core.test.models.TestProxySanitizerType;
import com.azure.core.util.Configuration;
import com.azure.core.util.CoreUtils;
import com.azure.identity.DefaultAzureCredentialBuilder;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.StringJoiner;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

public class CallAutomationLiveTestBase extends TestProxyTestBase {
    protected static final String CONNECTION_STRING = Configuration.getGlobalConfiguration()
        .get("COMMUNICATION_LIVETEST_STATIC_CONNECTION_STRING",
            "endpoint=https://REDACTED.communication.azure.com/;accesskey=QWNjZXNzS2V5");
    protected static final String ENDPOINT = Configuration.getGlobalConfiguration().get("COMMUNICATION_LIVETEST_STATIC_ENDPOINT",
        "https://REDACTED.communication.azure.com/");
    protected static final String ENDPOINT_401 = Configuration.getGlobalConfiguration().get("COMMUNICATION_LIVETEST_STATIC_ENDPOINT_401",
        "https://REDACTED.communication.azure.com/");
    protected static final String PMA_ENDPOINT = Configuration.getGlobalConfiguration().get("PMA_Endpoint", "https://REDACTED.communication.azure.com/");
    protected static final Boolean COMMUNICATION_CUSTOM_ENDPOINT_ENABLED = Configuration.getGlobalConfiguration().get("COMMUNICATION_CUSTOM_ENDPOINT_ENABLED", false);
    protected static final String MEDIA_SOURCE = Configuration.getGlobalConfiguration()
        .get("ACS_MEDIA_SOURCE", "https://acstestapp1.azurewebsites.net/audio/bot-hold-music-2.wav");
    private static final List<String> JSON_PROPERTIES_TO_REDACT
        = new ArrayList<>(Arrays.asList("id", "value", "rawId", "callbackUri"));
    private static List<TestProxySanitizer> addBodySanitizers() {
        return JSON_PROPERTIES_TO_REDACT.stream()
            .map(jsonProperty ->
                new TestProxySanitizer(String.format("$..%s", jsonProperty), null, "REDACTED",
                    TestProxySanitizerType.BODY_KEY))
            .collect(Collectors.toList());
    }
    protected CommunicationIdentityClientBuilder getCommunicationIdentityClientUsingConnectionString(HttpClient httpClient) {
        CommunicationIdentityClientBuilder builder = new CommunicationIdentityClientBuilder()
            .connectionString(CONNECTION_STRING)
            .httpClient(getHttpClientOrUsePlayback(httpClient));

        if (interceptorManager.isRecordMode()) {
            builder.addPolicy(interceptorManager.getRecordPolicy());
        }
        if (!interceptorManager.isLiveMode()) {
            interceptorManager.addSanitizers(addBodySanitizers());
        }
        return builder;
    }

    protected CallAutomationClientBuilder getCallAutomationClientUsingConnectionString(HttpClient httpClient) {

        CallAutomationClientBuilder builder;
        if (COMMUNICATION_CUSTOM_ENDPOINT_ENABLED) {
            builder = new CallAutomationClientBuilder()
                .connectionString(CONNECTION_STRING)
                .endpoint(PMA_ENDPOINT)
                .httpClient(getHttpClientOrUsePlayback(httpClient));
        } else {
            builder = new CallAutomationClientBuilder()
                .connectionString(CONNECTION_STRING)
                .httpClient(getHttpClientOrUsePlayback(httpClient));
        }

        if (interceptorManager.isRecordMode()) {
            builder.addPolicy(interceptorManager.getRecordPolicy());
        }
        if (!interceptorManager.isLiveMode()) {
            interceptorManager.addSanitizers(addBodySanitizers());
        }
        return builder;
    }

    protected Mono<HttpResponse> logHeaders(String testName, HttpPipelineNextPolicy next) {
        return next.process()
            .flatMap(httpResponse -> {
                final HttpResponse bufferedResponse = httpResponse.buffer();

                /* Should sanitize printed response url */
                System.out.println("Chain-ID header for " + testName + " request "
                    + bufferedResponse.getRequest().getUrl()
                    + ": " + bufferedResponse.getHeaderValue("X-Microsoft-Skype-Chain-ID"));
                return Mono.just(bufferedResponse);
            });
    }
}

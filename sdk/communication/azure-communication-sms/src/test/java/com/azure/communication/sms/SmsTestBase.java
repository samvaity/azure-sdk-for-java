// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.communication.sms;

import com.azure.communication.common.implementation.CommunicationConnectionString;
import com.azure.core.credential.TokenCredential;
import com.azure.core.http.HttpClient;
import com.azure.core.http.HttpPipelineNextPolicy;
import com.azure.core.http.HttpResponse;
import com.azure.core.test.TestMode;
import com.azure.core.test.TestProxyTestBase;
import com.azure.core.test.utils.MockTokenCredential;
import com.azure.core.util.Configuration;
import reactor.core.publisher.Mono;

import java.util.StringJoiner;

public class SmsTestBase extends TestProxyTestBase {
    protected static final String CONNECTION_STRING = Configuration.getGlobalConfiguration()
        .get("COMMUNICATION_LIVETEST_STATIC_CONNECTION_STRING", "endpoint=https://REDACTED.communication.azure.com/;accesskey=QWNjZXNzS2V5");

    protected static final String TO_PHONE_NUMBER = Configuration.getGlobalConfiguration()
        .get("AZURE_PHONE_NUMBER", "+15551234567");

    protected static final String FROM_PHONE_NUMBER = Configuration.getGlobalConfiguration()
        .get("AZURE_PHONE_NUMBER", "+15551234567");

    private static final String SKIP_INT_SMS_TEST = Configuration.getGlobalConfiguration()
        .get("COMMUNICATION_SKIP_INT_SMS_TEST", "False");

    protected static final String MESSAGE = "Hello";

    private static final StringJoiner JSON_PROPERTIES_TO_REDACT
        = new StringJoiner("\":\"|\"", "\"", "\":\"")
        .add("to");

    protected SmsClientBuilder getSmsClientWithToken(HttpClient httpClient, TokenCredential tokenCredential) {
        if (getTestMode() == TestMode.PLAYBACK) {
            tokenCredential = new MockTokenCredential();
        }
        SmsClientBuilder builder = new SmsClientBuilder();
        builder.endpoint(new CommunicationConnectionString(CONNECTION_STRING).getEndpoint())
            .credential(tokenCredential)
            .httpClient(interceptorManager.isPlaybackMode() ? interceptorManager.getPlaybackClient() : httpClient);

        if (getTestMode() == TestMode.RECORD) {
            builder.addPolicy(interceptorManager.getRecordPolicy());
        }
        return builder;
    }

    protected SmsClientBuilder getSmsClientUsingConnectionString(HttpClient httpClient) {
        SmsClientBuilder builder = new SmsClientBuilder();
        builder
            .connectionString(CONNECTION_STRING)
            .httpClient(interceptorManager.isPlaybackMode() ? interceptorManager.getPlaybackClient() : httpClient);

        if (getTestMode() == TestMode.RECORD) {
            builder.addPolicy(interceptorManager.getRecordPolicy());
        }
        return builder;
    }

    protected SmsClientBuilder addLoggingPolicy(SmsClientBuilder builder, String testName) {
        return builder.addPolicy((context, next) -> logHeaders(testName, next));
    }

    private Mono<HttpResponse> logHeaders(String testName, HttpPipelineNextPolicy next) {
        return next.process()
            .flatMap(httpResponse -> {
                final HttpResponse bufferedResponse = httpResponse.buffer();

                // Should sanitize printed reponse url
                System.out.println("MS-CV header for " + testName + " request "
                    + bufferedResponse.getRequest().getUrl() + ": " + bufferedResponse.getHeaderValue("MS-CV"));
                return Mono.just(bufferedResponse);
            });
    }

    protected boolean shouldEnableSmsTests() {
        return !Boolean.parseBoolean(SKIP_INT_SMS_TEST);
    }
}

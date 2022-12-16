package com.azure.core.test.policy;

import com.azure.core.http.HttpMethod;
import com.azure.core.http.HttpPipelineCallContext;
import com.azure.core.http.HttpPipelineNextPolicy;
import com.azure.core.http.HttpRequest;
import com.azure.core.http.HttpResponse;
import com.azure.core.http.policy.HttpPipelinePolicy;
import com.azure.core.test.models.RecordingRedactor;
import com.azure.core.test.utils.HttpURLConnectionHttpClient;
import com.azure.core.test.utils.TestProxyUtils;
import com.azure.core.util.Context;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.function.Function;

public class TestProxyRecordPolicy implements HttpPipelinePolicy {
    private final HttpURLConnectionHttpClient client = new HttpURLConnectionHttpClient();
    private RecordingRedactor redactor;
    private String xRecordingId;

    public void startRecording(String recordFile, List<Function<String, String>> redactors) {
        // TODO: redactors
        HttpRequest request = new HttpRequest(HttpMethod.POST, String.format("%s/record/start", TestProxyUtils.getProxyUrl()))
            .setBody(String.format("{\"x-recording-file\": \"%s\"}", recordFile));
        HttpResponse response = client.sendSync(request, Context.NONE);

        xRecordingId = response.getHeaderValue("x-recording-id");

        // redactor = new RecordingRedactor(redactors);
        // addSanitizers(response);
    }

    private void addSanitizers(HttpResponse response) {
        redactor.redact(response.getBodyAsBinaryData().toString());
        addUriKeySanitizer();
    }

    private void addUriKeySanitizer() {
        HttpRequest request = new HttpRequest(HttpMethod.POST, String.format("%s/Admin/AddSanitizer", TestProxyUtils.getProxyUrl()))
            .setBody("{\"value\":\"fakeaccount\",\"regex\":\"[a-z]+(?=\\\\.(?:table|blob|queue)\\\\.core\\\\.windows\\\\.net)\"}");
        request.setHeader("x-abstraction-identifier", "UriRegexSanitizer");
        request.setHeader("x-recording-id", xRecordingId);
        client.sendSync(request, Context.NONE);
    }

    public void stopRecording(Map<String, String> variables) {
        HttpRequest request = new HttpRequest(HttpMethod.POST, String.format("%s/record/stop", TestProxyUtils.getProxyUrl()))
            .setHeader("content-type", "application/json")
            .setHeader("x-recording-id", xRecordingId)
            .setBody("{}");
        client.sendSync(request, Context.NONE);
    }



    @Override
    public Mono<HttpResponse> process(HttpPipelineCallContext context, HttpPipelineNextPolicy next) {
        HttpRequest request = context.getHttpRequest();
        TestProxyUtils.changeHeaders(request, xRecordingId, "record");
        return next.process();
    }
}


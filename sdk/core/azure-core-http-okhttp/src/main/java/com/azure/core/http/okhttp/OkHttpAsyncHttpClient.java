// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.http.okhttp;

import com.azure.core.http.ContentType;
import com.azure.core.http.HttpClient;
import com.azure.core.http.HttpHeader;
import com.azure.core.http.HttpHeaderName;
import com.azure.core.http.HttpHeaders;
import com.azure.core.http.HttpMethod;
import com.azure.core.http.HttpRequest;
import com.azure.core.http.HttpResponse;
import com.azure.core.http.okhttp.implementation.BinaryDataRequestBody;
import com.azure.core.http.okhttp.implementation.OkHttpAsyncBufferedResponse;
import com.azure.core.http.okhttp.implementation.OkHttpAsyncResponse;
import com.azure.core.http.okhttp.implementation.OkHttpFluxRequestBody;
import com.azure.core.http.okhttp.implementation.OkHttpProgressReportingRequestBody;
import com.azure.core.implementation.util.BinaryDataContent;
import com.azure.core.implementation.util.BinaryDataHelper;
import com.azure.core.implementation.util.FluxByteBufferContent;
import com.azure.core.implementation.util.ServerSentEventHelper;
import com.azure.core.models.ServerSentEvent;
import com.azure.core.models.ServerSentEventListener;
import com.azure.core.util.BinaryData;
import com.azure.core.util.Context;
import com.azure.core.util.Contexts;
import com.azure.core.util.ProgressReporter;
import com.azure.core.util.logging.ClientLogger;
import com.azure.core.util.logging.LogLevel;
import okhttp3.Call;
import okhttp3.Headers;
import okhttp3.MediaType;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.ResponseBody;
import reactor.core.publisher.Mono;
import reactor.core.publisher.MonoSink;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.regex.Pattern;

/**
 * This class provides a OkHttp-based implementation for the {@link HttpClient} interface. Creating an instance of this
 * class can be achieved by using the {@link OkHttpAsyncHttpClientBuilder} class, which offers OkHttp-specific API for
 * features such as {@link OkHttpAsyncHttpClientBuilder#proxy(ProxyOptions) setProxy configuration}, and much more.
 *
 * <p>
 * <strong>Sample: Construct OkHttpAsyncHttpClient with Default Configuration</strong>
 * </p>
 *
 * <p>
 * The following code sample demonstrates the creation of a OkHttp HttpClient that uses port 80 and has no proxy.
 * </p>
 *
 * <!-- src_embed com.azure.core.http.okhttp.instantiation-simple -->
 * <pre>
 * HttpClient client = new OkHttpAsyncHttpClientBuilder&#40;&#41;
 *         .build&#40;&#41;;
 * </pre>
 * <!-- end com.azure.core.http.okhttp.instantiation-simple -->
 *
 * <p>
 * For more ways to instantiate OkHttpAsyncHttpClient, refer to {@link OkHttpAsyncHttpClientBuilder}.
 * </p>
 *
 * @see com.azure.core.http.okhttp
 * @see OkHttpAsyncHttpClientBuilder
 * @see HttpClient
 */
class OkHttpAsyncHttpClient implements HttpClient {

    private static final ClientLogger LOGGER = new ClientLogger(OkHttpAsyncHttpClient.class);
    private static final byte[] EMPTY_BODY = new byte[0];
    private static final RequestBody EMPTY_REQUEST_BODY = RequestBody.create(EMPTY_BODY);

    private static final String AZURE_EAGERLY_READ_RESPONSE = "azure-eagerly-read-response";
    private static final String AZURE_IGNORE_RESPONSE_BODY = "azure-ignore-response-body";
    private static final String AZURE_EAGERLY_CONVERT_HEADERS = "azure-eagerly-convert-headers";

    final OkHttpClient httpClient;
    private static final String LAST_EVENT_ID = "Last-Event-Id";
    private static final String DEFAULT_EVENT = "message";
    private static final Pattern DIGITS_ONLY = Pattern.compile("^[\\d]*$");


    OkHttpAsyncHttpClient(OkHttpClient httpClient) {
        this.httpClient = httpClient;
    }

    @Override
    public Mono<HttpResponse> send(HttpRequest request) {
        return send(request, Context.NONE);
    }

    @Override
    public Mono<HttpResponse> send(HttpRequest request, Context context) {
        boolean eagerlyReadResponse = (boolean) context.getData(AZURE_EAGERLY_READ_RESPONSE).orElse(false);
        boolean ignoreResponseBody = (boolean) context.getData(AZURE_IGNORE_RESPONSE_BODY).orElse(false);
        boolean eagerlyConvertHeaders = (boolean) context.getData(AZURE_EAGERLY_CONVERT_HEADERS).orElse(false);

        ProgressReporter progressReporter = Contexts.with(context).getHttpRequestProgressReporter();

        return Mono.create(sink -> sink.onRequest(value -> {
            // Using MonoSink::onRequest for back pressure support.

            // The blocking behavior toOkHttpRequest(r).subscribe call:
            //
            // The okhttp3.Request emitted by toOkHttpRequest(r) is chained from the body of request Flux<ByteBuffer>:
            // 1. If Flux<ByteBuffer> synchronous and send(r) caller does not apply subscribeOn then
            // subscribe block on caller thread.
            // 2. If Flux<ByteBuffer> synchronous and send(r) caller apply subscribeOn then
            // does not block caller thread but block on scheduler thread.
            // 3. If Flux<ByteBuffer> asynchronous then subscribe does not block caller thread
            // but block on the thread backing flux. This ignore any subscribeOn applied to send(r)
            //
            Mono.fromCallable(() -> toOkHttpRequest(request, progressReporter)).subscribe(okHttpRequest -> {
                try {
                    Call call = httpClient.newCall(okHttpRequest);
                    call.enqueue(new OkHttpCallback(sink, request, eagerlyReadResponse, ignoreResponseBody,
                        eagerlyConvertHeaders));
                    sink.onCancel(call::cancel);
                } catch (Exception ex) {
                    sink.error(ex);
                }
            }, sink::error);
        }));
    }

    @Override
    public HttpResponse sendSync(HttpRequest request, Context context) {
        boolean eagerlyReadResponse = (boolean) context.getData(AZURE_EAGERLY_READ_RESPONSE).orElse(false);
        boolean ignoreResponseBody = (boolean) context.getData(AZURE_IGNORE_RESPONSE_BODY).orElse(false);
        boolean eagerlyConvertHeaders = (boolean) context.getData(AZURE_EAGERLY_CONVERT_HEADERS).orElse(false);

        ProgressReporter progressReporter = Contexts.with(context).getHttpRequestProgressReporter();

        Request okHttpRequest = toOkHttpRequest(request, progressReporter);
        try {
            Response okHttpResponse = httpClient.newCall(okHttpRequest).execute();
            return toHttpResponse(request, okHttpResponse, eagerlyReadResponse, ignoreResponseBody,
                eagerlyConvertHeaders);
        } catch (IOException e) {
            throw LOGGER.logExceptionAsError(new UncheckedIOException(e));
        }
    }

    /**
     * Converts the given azure-core request to okhttp request.
     *
     * @param request the azure-core request
     * @param progressReporter the {@link ProgressReporter}. Can be null.
     * @return the okhttp request
     */
    private Request toOkHttpRequest(HttpRequest request, ProgressReporter progressReporter) {
        Request.Builder requestBuilder = new Request.Builder().url(request.getUrl());

        if (request.getHeaders() != null) {
            for (HttpHeader hdr : request.getHeaders()) {
                // OkHttp allows for headers with multiple values, but it treats them as separate headers,
                // therefore, we must call rb.addHeader for each value, using the same key for all of them
                hdr.getValuesList().forEach(value -> requestBuilder.addHeader(hdr.getName(), value));
            }
        }

        if (request.getHttpMethod() == HttpMethod.GET) {
            return requestBuilder.get().build();
        } else if (request.getHttpMethod() == HttpMethod.HEAD) {
            return requestBuilder.head().build();
        }

        RequestBody okHttpRequestBody = toOkHttpRequestBody(request.getBodyAsBinaryData(), request.getHeaders());
        if (progressReporter != null) {
            okHttpRequestBody = new OkHttpProgressReportingRequestBody(okHttpRequestBody, progressReporter);
        }
        return requestBuilder.method(request.getHttpMethod().toString(), okHttpRequestBody).build();
    }

    /**
     * Create a Mono of okhttp3.RequestBody from the given BinaryData.
     *
     * @param bodyContent The request body content
     * @param headers the headers associated with the original request
     * @return the Mono emitting okhttp request
     */
    private RequestBody toOkHttpRequestBody(BinaryData bodyContent, HttpHeaders headers) {
        if (bodyContent == null) {
            return EMPTY_REQUEST_BODY;
        }

        String contentType = headers.getValue(HttpHeaderName.CONTENT_TYPE);
        MediaType mediaType = (contentType == null) ? null : MediaType.parse(contentType);

        BinaryDataContent content = BinaryDataHelper.getContent(bodyContent);

        long effectiveContentLength = getRequestContentLength(content, headers);
        if (content instanceof FluxByteBufferContent) {
            // The OkHttpFluxRequestBody doesn't read bytes until it's triggered by OkHttp dispatcher.
            // TODO (alzimmer): Is this still required? Specifically find out if the timeout is needed.
            return new OkHttpFluxRequestBody(content, effectiveContentLength, mediaType,
                httpClient.callTimeoutMillis());
        } else {
            // Default is to use a generic BinaryData RequestBody.
            return new BinaryDataRequestBody(bodyContent, mediaType, effectiveContentLength);
        }
    }

    private static long getRequestContentLength(BinaryDataContent content, HttpHeaders headers) {
        Long contentLength = content.getLength();
        if (contentLength == null) {
            String contentLengthHeaderValue = headers.getValue(HttpHeaderName.CONTENT_LENGTH);
            if (contentLengthHeaderValue != null) {
                contentLength = Long.parseLong(contentLengthHeaderValue);
            } else {
                // -1 means that content length is unknown.
                contentLength = -1L;
            }
        }
        return contentLength;
    }

    private static HttpResponse toHttpResponse(HttpRequest request, Response response,
        boolean eagerlyReadResponse, boolean ignoreResponseBody, boolean eagerlyConvertHeaders) throws IOException {
        Headers responseHeaders = null;
        if (eagerlyReadResponse) {
            responseHeaders = response.headers();
        }
        if (isTextEventStream(responseHeaders)) {
            ServerSentEventListener listener = request.getServerSentEventListener();
            if (listener != null && response.body() != null) {
                processTextEventStream(request, response.body().byteStream(), listener);
            } else {
                LOGGER.log(LogLevel.INFORMATIONAL, () -> "No listener attached to the server sent event" +
                    " http request. Treating response as regular response.");
            }
            return new OkHttpAsyncBufferedResponse(response, request, EMPTY_BODY, eagerlyConvertHeaders);
        } else {
            if (eagerlyReadResponse || ignoreResponseBody) {
                try (ResponseBody body = response.body()) {
                    byte[] bytes = (body != null) ? body.bytes() : EMPTY_BODY;
                    return new OkHttpAsyncBufferedResponse(response, request, bytes, eagerlyConvertHeaders);
                }
            } else {
                return new OkHttpAsyncResponse(response, request, eagerlyConvertHeaders);
            }
        }
    }

    private static void processTextEventStream(HttpRequest httpRequest, InputStream inputStream, ServerSentEventListener listener) {
        RetrySSEResult retrySSEResult;
        try (BufferedReader reader
                 = new BufferedReader(new InputStreamReader(inputStream, "UTF-8"))) {
            retrySSEResult = processBuffer(reader, listener);
            if (retrySSEResult != null) {
                retryExceptionForSSE(retrySSEResult, listener, httpRequest);
            }
        } catch (IOException e) {
            throw LOGGER.logThrowableAsError(new UncheckedIOException(e));
        }
    }

    /**
     * Processes the sse buffer and dispatches the event
     *
     * @param reader The BufferedReader object
     * @param listener The listener object attached with the httpRequest
     */
    private static RetrySSEResult processBuffer(BufferedReader reader, ServerSentEventListener listener) {
        StringBuilder collectedData = new StringBuilder();
        ServerSentEvent event = null;
        try {
            String line;
            while ((line = reader.readLine()) != null) {
                collectedData.append(line).append("\n");
                if (isEndOfBlock(collectedData)) {
                    event = processLines(collectedData.toString().split("\n"));
                    if (!Objects.equals(event.getEvent(), DEFAULT_EVENT) || event.getData() != null) {
                        listener.onEvent(event);
                    }
                    collectedData = new StringBuilder(); // clear the collected data
                }
            }
            listener.onClose();
        } catch (IOException e) {
            return new RetrySSEResult(e,
                event != null ? event.getId() : -1,
                event != null ? ServerSentEventHelper.getRetryAfter(event) : null);
        }
        return null;
    }

    private static boolean isEndOfBlock(StringBuilder sb) {
        // blocks of data are separated by double newlines
        // add more end of blocks here if needed
        return sb.indexOf("\n\n") >= 0;
    }

    private static ServerSentEvent processLines(String[] lines) {
        List<String> eventData = null;
        ServerSentEvent event = new ServerSentEvent();

        for (String line : lines) {
            int idx = line.indexOf(':');
            if (idx == 0) {
                ServerSentEventHelper.setComment(event, line.substring(1).trim());
                continue;
            }
            String field = line.substring(0, idx < 0 ? lines.length : idx).trim().toLowerCase();
            String value = idx < 0 ? "" : line.substring(idx + 1).trim();

            switch (field) {
                case "event":
                    ServerSentEventHelper.setEvent(event, value);
                    break;
                case "data":
                    if(eventData == null) {
                        eventData = new ArrayList<>();
                    }
                    eventData.add(value);
                    break;
                case "id":
                    if (!value.isEmpty()) {
                        ServerSentEventHelper.setId(event, Long.parseLong(value));
                    }
                    break;
                case "retry":
                    if (!value.isEmpty() && DIGITS_ONLY.matcher(value).matches()) {
                        ServerSentEventHelper.setRetryAfter(event, Duration.ofMillis(Long.parseLong(value)));
                    }
                    break;
                default:
                    throw new IllegalArgumentException("Invalid data received from server");
            }
        }

        if (event.getEvent() == null) {
            ServerSentEventHelper.setEvent(event, DEFAULT_EVENT);
        }
        if (eventData != null) {
            ServerSentEventHelper.setData(event, eventData);
        }

        return event;
    }

    /**
     * Retries the request if the listener allows it
     *
     * @param retrySSEResult  the result of the retry
     * @param listener The listener object attached with the httpRequest
     * @param httpRequest the HTTP Request being sent
     */
    private static void retryExceptionForSSE(RetrySSEResult retrySSEResult, ServerSentEventListener listener, HttpRequest httpRequest) {
        if (Thread.currentThread().isInterrupted()
            || !listener.shouldRetry(retrySSEResult.getException(),
                retrySSEResult.getRetryAfter(),
                retrySSEResult.getLastEventId())) {
            listener.onError(retrySSEResult.getException());
            return;
        }

        if (retrySSEResult.getLastEventId() != -1) {
            httpRequest.getHeaders()
                .add(HttpHeaderName.fromString(LAST_EVENT_ID), String.valueOf(retrySSEResult.getLastEventId()));
        }

        try {
            if (retrySSEResult.getRetryAfter() != null) {
                Thread.sleep(retrySSEResult.getRetryAfter().toMillis());
            }
        } catch (InterruptedException ignored) {
            return;
        }

        if (!Thread.currentThread().isInterrupted()) {
            sendSync(httpRequest, Context.NONE);
        }
    }

    /**
     * Inner class to hold the result for a retry of an SSE request
     */
    private static class RetrySSEResult {
        private final long lastEventId;
        private final Duration retryAfter;
        private final IOException ioException;

        public RetrySSEResult(IOException e, long lastEventId, Duration retryAfter) {
            this.ioException = e;
            this.lastEventId = lastEventId;
            this.retryAfter = retryAfter;
        }

        public long getLastEventId() {
            return lastEventId;
        }

        public Duration getRetryAfter() {
            return retryAfter;
        }

        public IOException getException() {
            return ioException;
        }
    }

    private static class OkHttpCallback implements okhttp3.Callback {
        private final MonoSink<HttpResponse> sink;
        private final HttpRequest request;
        private final boolean eagerlyReadResponse;
        private final boolean ignoreResponseBody;
        private final boolean eagerlyConvertHeaders;

        OkHttpCallback(MonoSink<HttpResponse> sink, HttpRequest request, boolean eagerlyReadResponse,
            boolean ignoreResponseBody, boolean eagerlyConvertHeaders) {
            this.sink = sink;
            this.request = request;
            this.eagerlyReadResponse = eagerlyReadResponse;
            this.ignoreResponseBody = ignoreResponseBody;
            this.eagerlyConvertHeaders = eagerlyConvertHeaders;
        }

        @SuppressWarnings("NullableProblems")
        @Override
        public void onFailure(okhttp3.Call call, IOException e) {
            if (e.getSuppressed().length == 1) {
                // Propagate suppressed exception when there is one.
                // This happens when body emission fails in the middle.
                sink.error(e.getSuppressed()[0]);
            } else {
                sink.error(e);
            }
        }

        @SuppressWarnings("NullableProblems")
        @Override
        public void onResponse(okhttp3.Call call, okhttp3.Response response) {
            try {
                sink.success(
                    toHttpResponse(request, response, eagerlyReadResponse, ignoreResponseBody, eagerlyConvertHeaders));
            } catch (IOException ex) {
                // Reading the body bytes may cause an IOException, if it happens propagate it.
                sink.error(ex);
            }
        }
    }

    private static boolean isTextEventStream(Headers responseHeaders) {
        return responseHeaders != null && responseHeaders.get(HttpHeaderName.CONTENT_TYPE.toString()) != null &&
            responseHeaders.get(HttpHeaderName.CONTENT_TYPE.toString()).equals(ContentType.TEXT_EVENT_STREAM);
    }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.test.http;

import io.netty.handler.codec.http.HttpResponseStatus;
import reactor.core.publisher.Mono;
import reactor.netty.DisposableServer;
import reactor.netty.http.server.HttpServer;

import java.io.Closeable;
import java.util.Map;

/**
 * A simple {@link HttpServer} for unit testing the test proxy infrastructure.
 */
public class TestProxyTestServer implements Closeable {
    private final DisposableServer server;

    private static final String TEST_JSON_RESPONSE_BODY = "{\"modelId\":\"0cd2728b-210e-4c05-b706-f70554276bcc\","
        + "\"createdDateTime\":\"2022-08-31T00:00:00Z\",\"apiVersion\":\"2022-08-31\","
        + "  \"accountKey\" : \"secret_account_key\"," + "  \"client_secret\" : \"secret_client_secret\"}";
    private static final String TEST_XML_RESPONSE_BODY = "{\"Body\":\"<UserDelegationKey>"
        + "<SignedTid>sensitiveInformation=</SignedTid></UserDelegationKey>\",\"primaryKey\":"
        + "\"<PrimaryKey>fakePrimaryKey</PrimaryKey>\", \"TableName\":\"listtable09bf2a3d\"}";
    private static final String TEST_BODY_KEY_JSON = "{\"operationId\":\"31476478748_0ce26cf3-2a12-4361-9614-d1527efb87ef\",\"kind\":\"documentClassifierBuild\",\"targetResourceId\": \"/subscriptions/baa080as-d3f0-35ad-8cje-k1a859ca8j56/resourceGroups/rg-name/providers/Microsoft.CognitiveServices/accounts/account-Name\",\"resourceLocation\":\"REDACTED\",\"result\":{\"classifierId\":\"ce59dd57-b99a-47b8-8deb-bc72827e9c45\",\"createdDateTime\":\"2023-07-20T21:41:08Z\",\"expirationDateTime\":\"2025-07-19T21:41:08Z\",\"apiVersion\":\"2023-07-31\",\"docTypes\":{\"IRS-1040-B\":{\"azureBlobFileListSource\":{\"containerUrl\":\"https://azuresdktrainingdata.blob.core.windows.net/training-data-classifier\",\"fileList\":\"IRS-1040-B.jsonl\"}}}}}";
    /**
     * Constructor for TestProxyTestServer
     */
    public TestProxyTestServer() {
        server = HttpServer.create()
            .host("localhost")
            .route(routes -> routes
                .get("/", (req, res) -> res.status(HttpResponseStatus.OK).sendString(Mono.just("hello world")))
                .post("/first/path",
                    (req, res) -> res.status(HttpResponseStatus.OK).sendString(Mono.just("first path")))
                .post("/post", (req, res) -> res.status(HttpResponseStatus.OK))
                .get("/echoheaders", (req, res) -> {
                    for (Map.Entry<String, String> requestHeader : req.requestHeaders()) {
                        res.addHeader(requestHeader.getKey(), requestHeader.getValue());
                    }
                    return res.status(HttpResponseStatus.OK).sendString(Mono.just("echoheaders"));
                })
                .get("/fr/path/1", (req, res) -> {
                    for (Map.Entry<String, String> requestHeader : req.requestHeaders()) {
                        res.addHeader(requestHeader.getKey(), requestHeader.getValue());
                    }
                    return res.status(HttpResponseStatus.OK)
                        .addHeader("Content-Type", "application/json")
                        .addHeader("Operation-Location",
                            "https://resourceInfo.cognitiveservices.azure.com/fr/models//905a58f9-131e-42b8-8410-493ab1517d62")
                        .sendString(Mono.just(TEST_JSON_RESPONSE_BODY));
                })
                .post("/testBodyKey",
                    (req, res) -> res.status(HttpResponseStatus.OK)
                        .addHeader("Content-Type", "application/json")
                        .sendString(Mono.just(TEST_BODY_KEY_JSON)))
                .get("/fr/path/2",
                    (req, res) -> res.status(HttpResponseStatus.OK)
                        .addHeader("Content-Type", "application/json")
                        .sendString(Mono.just(TEST_XML_RESPONSE_BODY)))
                .get("/getRedirect",
                    (req, res) -> res.status(HttpResponseStatus.TEMPORARY_REDIRECT)
                        .addHeader("Content-Type", "application/json")
                        .addHeader("Location", "http://localhost:" + port() + "/echoheaders")))

            .bindNow();
    }

    /**
     * Get the port of the server.
     *
     * @return The port of the server.
     */
    public int port() {
        return server.port();
    }

    @Override
    public void close() {
        server.disposeNow();
    }
}

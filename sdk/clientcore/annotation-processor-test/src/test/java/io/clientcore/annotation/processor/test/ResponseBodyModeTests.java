// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package io.clientcore.annotation.processor.test;

import io.clientcore.annotation.processor.test.implementation.Service30ClientServiceImpl;
import io.clientcore.annotation.processor.test.implementation.models.HttpBinJSON;
import io.clientcore.core.http.models.RequestOptions;
import io.clientcore.core.http.models.Response;
import io.clientcore.core.util.binarydata.ByteArrayBinaryData;
import io.clientcore.core.util.binarydata.ByteBufferBinaryData;
import io.clientcore.core.util.binarydata.InputStreamBinaryData;
import org.junit.jupiter.api.Test;

import java.io.IOException;

import static io.clientcore.core.http.models.ResponseBodyMode.BUFFER;
import static io.clientcore.core.http.models.ResponseBodyMode.DESERIALIZE;
import static io.clientcore.core.http.models.ResponseBodyMode.IGNORE;
import static io.clientcore.core.http.models.ResponseBodyMode.STREAM;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class ResponseBodyModeTests {

    @Test
    public void bodyIsPresentWhenNoBodyHandlingOptionIsSet() throws IOException {
        Service30 service = createService(Service30.class);
        HttpBinJSON httpBinJSON = service.put(getServerUri(isSecure()), 42, null);

        assertNotNull(httpBinJSON);

        try (Response<HttpBinJSON> response = service.putResponse(getServerUri(isSecure()), 42, null)) {
            assertNotNull(response.getBody());
            assertNotEquals(0, response.getBody().getLength());
            assertNotNull(response.getValue());
        }
    }

    @Test
    public void bodyIsEmptyWhenIgnoreBodyIsSet() throws IOException {
        Service30 service = createService(Service30.class);
        RequestOptions requestOptions = new RequestOptions().setResponseBodyMode(IGNORE);
        HttpBinJSON httpBinJSON = service.put(getServerUri(isSecure()), 42, requestOptions);

        assertNull(httpBinJSON);

        try (Response<HttpBinJSON> response = service.putResponse(getServerUri(isSecure()), 42, requestOptions)) {
            assertNotNull(response.getBody());
            assertEquals(0, response.getBody().getLength());
            assertNull(response.getValue());
        }
    }

    @Test
    public void bodyIsEmptyWhenIgnoreBodyIsSetForStreamResponse() throws IOException {
        Service30 service = createService(Service30.class);
        RequestOptions requestOptions = new RequestOptions().setResponseBodyMode(IGNORE);
        HttpBinJSON httpBinJSON = service.postStream(getServerUri(isSecure()), 42, requestOptions);

        assertNull(httpBinJSON);

        try (
            Response<HttpBinJSON> response = service.postStreamResponse(getServerUri(isSecure()), 42, requestOptions)) {
            assertNotNull(response.getBody());
            assertEquals(0, response.getBody().getLength());
            assertNull(response.getValue());
        }
    }

    @Test
    public void bodyIsStreamedWhenResponseBodyModeIndicatesIt() throws IOException {
        Service30 service = createService(Service30.class);
        RequestOptions requestOptions = new RequestOptions().setResponseBodyMode(STREAM);

        try (
            Response<HttpBinJSON> response = service.postStreamResponse(getServerUri(isSecure()), 42, requestOptions)) {
            assertNotNull(response.getBody());
            assertNotEquals(0, response.getBody().getLength());
            assertTrue(response.getBody() instanceof InputStreamBinaryData);
        }
    }

    @Test
    public void bodyIsBufferedWhenResponseBodyModeIndicatesIt() throws IOException {
        Service30 service = createService(Service30.class);
        RequestOptions requestOptions = new RequestOptions().setResponseBodyMode(BUFFER);
        HttpBinJSON httpBinJSON = service.postStream(getServerUri(isSecure()), 42, requestOptions);

        assertNotNull(httpBinJSON);

        try (
            Response<HttpBinJSON> response = service.postStreamResponse(getServerUri(isSecure()), 42, requestOptions)) {
            assertNotNull(response.getBody());
            assertNotEquals(0, response.getBody().getLength());
            assertTrue(response.getBody() instanceof ByteArrayBinaryData
                || response.getBody() instanceof ByteBufferBinaryData);
        }
    }

    @Test
    public void bodyIsDeserializedWhenResponseBodyModeIndicatesIt() throws IOException {
        Service30ClientService service = createService(Service30.class);
        RequestOptions requestOptions = new RequestOptions().setResponseBodyMode(DESERIALIZE);
        HttpBinJSON httpBinJSON = service.postStream(getServerUri(isSecure()), 42, requestOptions);

        assertNotNull(httpBinJSON);

        try (
            Response<HttpBinJSON> response = service.postStreamResponse(getServerUri(isSecure()), 42, requestOptions)) {
            assertNotNull(response.getBody());
            assertNotEquals(0, response.getBody().getLength());
            assertNotNull(response.getValue());
        }
    }
}

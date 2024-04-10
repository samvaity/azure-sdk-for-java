// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package io.clientcore.core.http.client;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.github.tomakehurst.wiremock.http.trafficlistener.WiremockNetworkTrafficListener;
import io.clientcore.core.http.models.HttpHeaderName;
import io.clientcore.core.http.models.HttpHeaders;
import io.clientcore.core.http.models.HttpMethod;
import io.clientcore.core.http.models.HttpRequest;
import io.clientcore.core.http.models.Response;
import io.clientcore.core.util.binarydata.BinaryData;
import org.junit.jupiter.api.Test;

import java.net.Socket;
import java.nio.ByteBuffer;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;

public class SocketTest {
    private static final ConnectionCountingTrafficListener CONNECTION_COUNTER = new ConnectionCountingTrafficListener();

    private static class ConnectionCountingTrafficListener implements WiremockNetworkTrafficListener {
        private final AtomicInteger openedConnections = new AtomicInteger(0);

        @Override
        public void opened(Socket socket) {
            System.out.println("Socket opened");
            openedConnections.incrementAndGet();
            System.out.println("Opened connections: " + openedConnections.get());
        }

        @Override
        public void incoming(Socket socket, ByteBuffer bytes) {
        }

        @Override
        public void outgoing(Socket socket, ByteBuffer bytes) {
        }

        @Override
        public void closed(Socket socket) {
        }

        public int openedConnections() {
            System.out.println("Opened connections method: " + openedConnections.get());
            return openedConnections.get();
        }
    }

    @Test
    public void connectionPoolingWorks() {
        int initialOpenedConnections = CONNECTION_COUNTER.openedConnections();
        System.out.println("Connections opened: " + initialOpenedConnections);
        // Create a WireMockServer with a NetworkTrafficListener
        WireMockServer wireMockServer = new WireMockServer(
            new WireMockConfiguration().dynamicPort().networkTrafficListener(CONNECTION_COUNTER));
        wireMockServer.start();

        // Configure WireMock to stub a response
        WireMock.configureFor("localhost", wireMockServer.port());
        String url = "http://localhost:" + wireMockServer.port() + "/test";


       // WireMock.stubFor(WireMock.any(WireMock.anyUrl()).willReturn(WireMock.aResponse().withStatus(200).withBody("OK")));
//        WireMock.stubFor(WireMock.get(WireMock.urlEqualTo("/test")).willReturn(WireMock.aResponse().withBody("Response")));

        WireMock.stubFor(WireMock.patch(WireMock.urlEqualTo("/test")).willReturn(WireMock.aResponse().withBody("Sam")));

        //        wireMockServer.stubFor(any(urlPathEqualTo(url)).willReturn(aResponse().withStatus(200).withBody("OK")));
        // Create a socket and connect it to the server
        for (int i = 0; i < 5; i++) {
            Response<?> response = new DefaultHttpClientBuilder().build()
                .send(new HttpRequest(HttpMethod.PATCH, url)
                    .setHeaders(new HttpHeaders()
                        .add(HttpHeaderName.CONTENT_TYPE, "application/json")
                        .add(HttpHeaderName.CONTENT_LENGTH, String.valueOf("OK".length()))).setBody(BinaryData.fromString("OK")));
            System.out.println("connection counter" + CONNECTION_COUNTER.openedConnections());
        }

        assertEquals( 6, CONNECTION_COUNTER.openedConnections());

        // Close the socket
//        socket.close();

        // Stop the server
        wireMockServer.stop();
    }
}

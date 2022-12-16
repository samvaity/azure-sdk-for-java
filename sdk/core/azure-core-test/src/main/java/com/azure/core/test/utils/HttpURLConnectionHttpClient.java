package com.azure.core.test.utils;

import com.azure.core.http.HttpClient;
import com.azure.core.http.HttpHeader;
import com.azure.core.http.HttpHeaders;
import com.azure.core.http.HttpRequest;
import com.azure.core.http.HttpResponse;
import com.azure.core.util.BinaryData;
import com.azure.core.util.Context;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.BufferedOutputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

public class HttpURLConnectionHttpClient implements HttpClient {

    @Override
    public HttpResponse sendSync(HttpRequest request, Context context) {
        HttpURLConnection con = null;
        try {
            URL obj = new URL(request.getUrl().toString());
            int responseCode;
            con = (HttpURLConnection) obj.openConnection();

            con.setRequestMethod(request.getHttpMethod().name());
            HttpHeaders headers = request.getHeaders();
            if (headers != null) {
                for (HttpHeader header : headers) {
                    String name = header.getName();

                    con.setRequestProperty(name, header.getValue());
                }
            }

            responseCode = con.getResponseCode();
            System.out.println("Request URL :: " + request.getUrl());
            System.out.println("Response Code :: " + responseCode);

            if (responseCode == HttpURLConnection.HTTP_OK) { // success
                BufferedReader in = new BufferedReader(new InputStreamReader(con.getInputStream()));
                String inputLine;
                StringBuffer response = new StringBuffer();
                InputStream inputStream = con.getInputStream();
                final int available = inputStream.available();
                final byte[] actualBytes = new byte[available];
                final int read = inputStream.read(actualBytes);

                while ((inputLine = in.readLine()) != null) {
                    response.append(inputLine);
                }
                in.close();
                inputStream.close();

                HttpURLConnection finalCon = con;
                return new HttpResponse(request) {
                    @Override
                    public int getStatusCode() {
                        return responseCode;
                    }

                    @Override
                    public String getHeaderValue(String name) {
                        return finalCon.getHeaderField(name);
                    }

                    @Override
                    public HttpHeaders getHeaders() {
                        HttpHeaders ret = new HttpHeaders();
                        Map<String, List<String>> headers = finalCon.getHeaderFields();
                        for (String key : headers.keySet()) {
                            for (String value : headers.get(key)) {
                                ret.add(key, value);
                            }
                        }
                        return ret;
                    }

                    @Override
                    public Flux<ByteBuffer> getBody() {
                        return Flux.just();
                    }

                    @Override
                    public Mono<byte[]> getBodyAsByteArray() {
                        return Mono.just(actualBytes);
                    }

                    @Override
                    public Mono<String> getBodyAsString() {
                        return Mono.just(new String(actualBytes, StandardCharsets.UTF_8));
                    }

                    @Override
                    public Mono<String> getBodyAsString(Charset charset) {
                        return Mono.just(new String(actualBytes, charset));
                    }
                };
            } else {
                System.out.println("Request did not work.");
                System.out.println(request.getHttpMethod().toString());
                System.out.println();
                return null;
            }
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        finally {
            if (con != null) {
                con.disconnect();
            }
        }
    }

    @Override
    public Mono<HttpResponse> send(HttpRequest request) {
        HttpURLConnection connection = null;

        try {

            connection = (HttpURLConnection) request.getUrl().openConnection();
            connection.setRequestMethod(request.getHttpMethod().toString());

            HttpHeaders headers = request.getHeaders();
            if (headers != null) {
                for (HttpHeader header : headers) {
                    String name = header.getName();

                    connection.setRequestProperty(name, headers.getValue(name));
                }
            }
            BinaryData body = request.getBodyAsBinaryData();
            if (body != null) {
                connection.setDoOutput(true);
                BufferedOutputStream stream = new BufferedOutputStream(connection.getOutputStream());
                stream.write(body.toBytes());
                stream.flush();
            }
            connection.connect();
            return Mono.just(createHttpResponse(connection));
        } catch (IOException e) {
            throw new RuntimeException(e);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }

    private HttpResponse createHttpResponse(HttpURLConnection connection) {

        if (connection == null) {
            return null;
        }

        ByteBuffer body;
        try {
            byte[] bytes = BinaryData.fromStream(connection.getInputStream()).toBytes();
            body = ByteBuffer.wrap(bytes);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        return new HttpResponse(null) {
            @Override
            public int getStatusCode() {
                try {
                    return connection.getResponseCode();
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }

            @Override
            public String getHeaderValue(String name) {
                return connection.getHeaderField(name);
            }

            @Override
            public HttpHeaders getHeaders() {
                HttpHeaders ret = new HttpHeaders();
                Map<String, List<String>> headers = connection.getHeaderFields();
                for (String key : headers.keySet()) {
                    for (String value : headers.get(key)) {
                        ret.add(key, value);
                    }
                }
                return ret;
            }

            @Override
            public Flux<ByteBuffer> getBody() {
                return Flux.just(body);
            }

            @Override
            public Mono<byte[]> getBodyAsByteArray() {
                return Mono.just(body.array());
            }

            @Override
            public Mono<String> getBodyAsString() {
                return Mono.just(new String(body.array(), StandardCharsets.UTF_8));
            }

            @Override
            public Mono<String> getBodyAsString(Charset charset) {
                return Mono.just(new String(body.array(), charset));
            }
        };
    }
}

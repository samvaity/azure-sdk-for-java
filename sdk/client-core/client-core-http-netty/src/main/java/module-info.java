// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

module com.typespec.http.netty {
    requires transitive com.typespec.core;
    requires io.netty.buffer;
    requires io.netty.codec;
    requires io.netty.codec.http;
    requires io.netty.common;
    requires io.netty.handler;
    requires io.netty.handler.proxy;
    requires io.netty.resolver;
    requires io.netty.transport;
    requires reactor.netty.core;
    requires reactor.netty.http;

    exports com.typespec.core.http.netty;

    provides com.typespec.core.http.HttpClientProvider
        with com.typespec.core.http.netty.NettyAsyncHttpClientProvider;

    uses com.typespec.core.http.HttpClientProvider;
}

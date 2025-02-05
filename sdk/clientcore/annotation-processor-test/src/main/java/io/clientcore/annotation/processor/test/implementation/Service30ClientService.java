// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package io.clientcore.annotation.processor.test.implementation;

import io.clientcore.annotation.processor.test.implementation.models.HttpBinJSON;
import io.clientcore.core.annotation.ServiceInterface;
import io.clientcore.core.http.annotation.BodyParam;
import io.clientcore.core.http.annotation.HostParam;
import io.clientcore.core.http.annotation.HttpRequestInformation;
import io.clientcore.core.http.models.ContentType;
import io.clientcore.core.http.models.HttpMethod;
import io.clientcore.core.http.models.RequestOptions;
import io.clientcore.core.http.models.Response;

@ServiceInterface(name = "Service30ClientService", host = "{uri}")
interface Service30ClientService {
    @HttpRequestInformation(method = HttpMethod.PUT, path = "put", expectedStatusCodes = { 200 })
    HttpBinJSON put(@HostParam("uri") String uri, @BodyParam(ContentType.APPLICATION_OCTET_STREAM) int putBody,
                    RequestOptions requestOptions);

    @HttpRequestInformation(method = HttpMethod.PUT, path = "put", expectedStatusCodes = { 200 })
    Response<HttpBinJSON> putResponse(@HostParam("uri") String uri,
                                      @BodyParam(ContentType.APPLICATION_OCTET_STREAM) int putBody, RequestOptions requestOptions);

    @HttpRequestInformation(method = HttpMethod.POST, path = "stream", expectedStatusCodes = { 200 })
    HttpBinJSON postStream(@HostParam("uri") String uri,
                           @BodyParam(ContentType.APPLICATION_OCTET_STREAM) int putBody, RequestOptions requestOptions);

    @HttpRequestInformation(method = HttpMethod.POST, path = "stream", expectedStatusCodes = { 200 })
    Response<HttpBinJSON> postStreamResponse(@HostParam("uri") String uri,
                                             @BodyParam(ContentType.APPLICATION_OCTET_STREAM) int putBody, RequestOptions requestOptions);
}

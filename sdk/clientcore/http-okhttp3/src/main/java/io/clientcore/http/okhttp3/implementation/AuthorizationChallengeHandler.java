// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package io.clientcore.http.okhttp3.implementation;

import io.clientcore.core.util.binarydata.BinaryData;

import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

/**
 * Interface for handling authorization challenges.
 */
public interface AuthorizationChallengeHandler {
    String handleBasic();
    String handleDigest(String method, String uri, List<Map<String, String>> challenges, Supplier<BinaryData> entityBodySupplier);
    String attemptToPipelineAuthorization(String method, String uri, Supplier<BinaryData> entityBodySupplier);
    void consumeAuthenticationInfoHeader(Map<String, String> authenticationInfoMap);
}

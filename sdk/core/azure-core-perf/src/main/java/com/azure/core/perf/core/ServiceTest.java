// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.perf.core;

import com.azure.core.util.Configuration;
import com.azure.core.util.CoreUtils;
import com.azure.perf.test.core.PerfStressOptions;
import com.azure.perf.test.core.PerfStressTest;
import com.azure.storage.blob.BlobClientBuilder;
import com.azure.storage.blob.BlobServiceClientBuilder;

public abstract class ServiceTest<TOptions extends PerfStressOptions> extends PerfStressTest<TOptions> {

    protected final BlobClientBuilder blobClientBuilder;
    private final Configuration configuration;

    public ServiceTest(TOptions options) {
        super(options);
        configuration = Configuration.getGlobalConfiguration().clone();
        String connectionString = configuration.get("STORAGE_CONNECTION_STRING");

        if (CoreUtils.isNullOrEmpty(connectionString)) {
            throw new IllegalStateException("Environment variable STORAGE_CONNECTION_STRING must be set");
        }

        // Set up the service client builder
        blobClientBuilder = new BlobClientBuilder()
            .connectionString(connectionString);
    }
}

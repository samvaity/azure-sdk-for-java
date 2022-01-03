// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.perf.core;

import com.azure.core.util.Configuration;
import com.azure.core.util.CoreUtils;
import com.azure.perf.test.core.PerfStressOptions;
import com.azure.perf.test.core.PerfStressTest;
import com.azure.storage.blob.BlobServiceClientBuilder;

import java.util.UUID;

public abstract class ServiceTest<TOptions extends PerfStressOptions> extends PerfStressTest<TOptions> {

    protected BlobServiceClientBuilder blobServiceClientBuilder;
    protected final String filePath;
    protected final boolean useSharedClient;
    protected static final String CONTAINER_NAME = "perfstress-" + UUID.randomUUID();
    protected static final String BLOB_NAME = "perfblobtest-" + UUID.randomUUID();

    private final Configuration configuration;

    public ServiceTest(TOptions options) {
        super(options);
        configuration = Configuration.getGlobalConfiguration().clone();
        String connectionString = configuration.get("STORAGE_CONNECTION_STRING");
        filePath = configuration.get("FILE_PATH");
        useSharedClient = CoreUtils.isNullOrEmpty(configuration.get("USE_SHARED_CLIENT"));

        if (CoreUtils.isNullOrEmpty(connectionString)) {
            throw new IllegalStateException("Environment variable STORAGE_CONNECTION_STRING must be set");
        }

        if (CoreUtils.isNullOrEmpty(filePath)) {
            throw new IllegalStateException("Environment variable 'FILE_PATH' must be set");
        }

        // Set up the service client builder
        blobServiceClientBuilder = new BlobServiceClientBuilder().connectionString(connectionString);
    }
}

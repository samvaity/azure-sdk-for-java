// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.perf;

import com.azure.core.perf.core.ServiceTest;
import com.azure.perf.test.core.PerfStressOptions;
import com.azure.storage.blob.BlobContainerAsyncClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceAsyncClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.models.BlobProperties;
import reactor.core.publisher.Mono;

import java.util.UUID;

public class GetBlobProperties extends ServiceTest<PerfStressOptions> {
    public GetBlobProperties(PerfStressOptions options) {
        super(options);
    }

    @Override
    public Mono<Void> globalSetupAsync() {
        return super.globalSetupAsync();
    }

    @Override
    public Mono<Void> globalCleanupAsync() {
        return super.globalCleanupAsync();
    }

    @Override
    public void run() {
        String blobName = "perfblobtest-" + UUID.randomUUID();

        BlobServiceClient storageClient = blobServiceClientBuilder.buildClient();

        BlobContainerClient blobContainerClient = storageClient.createBlobContainer("perfupload" + UUID.randomUUID());
        BlobProperties blobProperties = blobContainerClient.getBlobClient(blobName).getProperties();
        assert blobProperties.getCreationTime() != null;
        assert blobProperties.getExpiresOn() != null;
    }

    @Override
    public Mono<Void> runAsync() {
        String blobName = "perfblobtest-" + UUID.randomUUID();

        BlobServiceAsyncClient storageAsyncClient = blobServiceClientBuilder.buildAsyncClient();

        BlobContainerAsyncClient
            blobContainerAsyncClient = storageAsyncClient.createBlobContainer("perfupload" + UUID.randomUUID()).block();
        return blobContainerAsyncClient.getBlobAsyncClient(blobName)
            .getProperties()
            .then();
    }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.perf;

import com.azure.core.http.HttpClient;
import com.azure.core.http.netty.NettyAsyncHttpClientProvider;
import com.azure.core.perf.core.ServiceTest;
import com.azure.core.util.HttpClientOptions;
import com.azure.perf.test.core.PerfStressOptions;
import com.azure.storage.blob.BlobContainerAsyncClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceAsyncClient;
import com.azure.storage.blob.BlobServiceClient;
import reactor.core.publisher.Mono;

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

        if (useSharedClient) {
            BlobServiceClient blobServiceClient = blobServiceClientBuilder.buildClient();
            performGetProperties(blobServiceClient);
        } else {
            // use a customized http client
            HttpClientOptions clientOptions = new HttpClientOptions().setMaximumConnectionPoolSize(50);
            HttpClient client1 = new NettyAsyncHttpClientProvider().createInstance(clientOptions);

            BlobServiceClient blobServiceClient = blobServiceClientBuilder
                .httpClient(client1)
                .buildClient();

            performGetProperties(blobServiceClient);
        }
    }

    @Override
    public Mono<Void> runAsync() {

        if (useSharedClient) {
            BlobServiceAsyncClient blobServiceAsyncClient = blobServiceClientBuilder.buildAsyncClient();
            return performGetPropertiesAsync(blobServiceAsyncClient);
        } else {
            // use a customized http client
            HttpClientOptions clientOptions = new HttpClientOptions().setMaximumConnectionPoolSize(50);
            HttpClient client1 = new NettyAsyncHttpClientProvider().createInstance(clientOptions);

            BlobServiceAsyncClient blobServiceAsyncClient = blobServiceClientBuilder
                .httpClient(client1)
                .buildAsyncClient();

            return performGetPropertiesAsync(blobServiceAsyncClient);
        }
    }

    private void performGetProperties(BlobServiceClient blobServiceClient) {
        BlobContainerClient blobContainerClient = blobServiceClient.createBlobContainer(CONTAINER_NAME);
        blobContainerClient.getBlobClient(BLOB_NAME).getProperties();
    }

    private Mono<Void> performGetPropertiesAsync(BlobServiceAsyncClient blobServiceAsyncClient) {
        BlobContainerAsyncClient blobContainerAsyncClient
            = blobServiceAsyncClient.createBlobContainer(CONTAINER_NAME).block();

        return blobContainerAsyncClient.getBlobAsyncClient(BLOB_NAME)
            .getProperties()
            .then();
    }
}

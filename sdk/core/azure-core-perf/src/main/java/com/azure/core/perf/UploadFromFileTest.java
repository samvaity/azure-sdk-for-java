// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.core.perf;

import com.azure.core.http.HttpClient;
import com.azure.core.http.netty.NettyAsyncHttpClientProvider;
import com.azure.core.perf.core.ServiceTest;
import com.azure.core.util.HttpClientOptions;
import com.azure.perf.test.core.PerfStressOptions;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceAsyncClient;
import com.azure.storage.blob.BlobServiceClient;
import reactor.core.publisher.Mono;

public class UploadFromFileTest extends ServiceTest<PerfStressOptions> {
    public UploadFromFileTest(PerfStressOptions options) {
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
            performUploadFromFile(blobServiceClient);

        } else {
            // use a customized http client
            HttpClientOptions clientOptions = new HttpClientOptions().setMaximumConnectionPoolSize(50);
            HttpClient client1 = new NettyAsyncHttpClientProvider().createInstance(clientOptions);

            BlobServiceClient blobServiceClient = blobServiceClientBuilder
                .httpClient(client1)
                .buildClient();

            performUploadFromFile(blobServiceClient);
        }
    }

    @Override
    public Mono<Void> runAsync() {

        if (useSharedClient) {
            BlobServiceAsyncClient blobServiceAsyncClient = blobServiceClientBuilder.buildAsyncClient();
            return performUploadFromFileAsync(blobServiceAsyncClient);
        } else {
            // use a customized http client
            HttpClientOptions clientOptions = new HttpClientOptions().setMaximumConnectionPoolSize(50);
            HttpClient client1 = new NettyAsyncHttpClientProvider().createInstance(clientOptions);

            BlobServiceAsyncClient blobServiceAsyncClient = blobServiceClientBuilder
                .httpClient(client1)
                .buildAsyncClient();

            return performUploadFromFileAsync(blobServiceAsyncClient);
        }
    }

    private void performUploadFromFile(BlobServiceClient blobServiceClient) {
        BlobContainerClient blobContainerClient = blobServiceClient.createBlobContainer(CONTAINER_NAME);
        BlobClient blobClient = blobContainerClient.getBlobClient(BLOB_NAME);
        blobClient.uploadFromFile(filePath, true);
    }

    private Mono<Void> performUploadFromFileAsync(BlobServiceAsyncClient blobServiceAsyncClient) {
        return blobServiceAsyncClient.createBlobContainer(CONTAINER_NAME)
            .flatMap(blobContainerAsyncClient -> blobContainerAsyncClient.getBlobAsyncClient(BLOB_NAME)
                .uploadFromFile(filePath, true));
    }
}

package com.azure.ai.formrecognizer.implementation.models;

/**
 * The {@link ContentSource} represents the base type for different
 * types of content sources that service can provide data
 *
 * @see AzureBlobContentSource
 * @see Base64ContentSource
 * @see LocalContentSource
 * @see WebContentSource
 */
public abstract class ContentSource {
    // No common properties, used only as discriminator type.
}

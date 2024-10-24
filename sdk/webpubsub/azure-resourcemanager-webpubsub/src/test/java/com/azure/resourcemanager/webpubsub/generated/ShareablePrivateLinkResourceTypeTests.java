// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) AutoRest Code Generator.

package com.azure.resourcemanager.webpubsub.generated;

import com.azure.core.util.BinaryData;
import com.azure.resourcemanager.webpubsub.models.ShareablePrivateLinkResourceProperties;
import com.azure.resourcemanager.webpubsub.models.ShareablePrivateLinkResourceType;
import org.junit.jupiter.api.Assertions;

public final class ShareablePrivateLinkResourceTypeTests {
    @org.junit.jupiter.api.Test
    public void testDeserialize() throws Exception {
        ShareablePrivateLinkResourceType model =
            BinaryData
                .fromString(
                    "{\"name\":\"kpyklyhp\",\"properties\":{\"description\":\"dpvruud\",\"groupId\":\"zibt\",\"type\":\"stgktst\"}}")
                .toObject(ShareablePrivateLinkResourceType.class);
        Assertions.assertEquals("kpyklyhp", model.name());
        Assertions.assertEquals("dpvruud", model.properties().description());
        Assertions.assertEquals("zibt", model.properties().groupId());
        Assertions.assertEquals("stgktst", model.properties().type());
    }

    @org.junit.jupiter.api.Test
    public void testSerialize() throws Exception {
        ShareablePrivateLinkResourceType model =
            new ShareablePrivateLinkResourceType()
                .withName("kpyklyhp")
                .withProperties(
                    new ShareablePrivateLinkResourceProperties()
                        .withDescription("dpvruud")
                        .withGroupId("zibt")
                        .withType("stgktst"));
        model = BinaryData.fromObject(model).toObject(ShareablePrivateLinkResourceType.class);
        Assertions.assertEquals("kpyklyhp", model.name());
        Assertions.assertEquals("dpvruud", model.properties().description());
        Assertions.assertEquals("zibt", model.properties().groupId());
        Assertions.assertEquals("stgktst", model.properties().type());
    }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) AutoRest Code Generator.

package com.azure.resourcemanager.elasticsan.generated;

import com.azure.core.util.BinaryData;
import com.azure.resourcemanager.elasticsan.fluent.models.VolumeGroupProperties;
import com.azure.resourcemanager.elasticsan.models.Action;
import com.azure.resourcemanager.elasticsan.models.EncryptionType;
import com.azure.resourcemanager.elasticsan.models.NetworkRuleSet;
import com.azure.resourcemanager.elasticsan.models.StorageTargetType;
import com.azure.resourcemanager.elasticsan.models.VirtualNetworkRule;
import java.util.Arrays;
import org.junit.jupiter.api.Assertions;

public final class VolumeGroupPropertiesTests {
    @org.junit.jupiter.api.Test
    public void testDeserialize() throws Exception {
        VolumeGroupProperties model =
            BinaryData
                .fromString(
                    "{\"provisioningState\":\"Updating\",\"protocolType\":\"Iscsi\",\"encryption\":\"EncryptionAtRestWithPlatformKey\",\"networkAcls\":{\"virtualNetworkRules\":[{\"id\":\"q\",\"action\":\"Allow\",\"state\":\"deprovisioning\"},{\"id\":\"lihkaetcktvfc\",\"action\":\"Allow\",\"state\":\"provisioning\"},{\"id\":\"kymuctqhjfbebr\",\"action\":\"Allow\",\"state\":\"deprovisioning\"},{\"id\":\"fuwutttxf\",\"action\":\"Allow\",\"state\":\"provisioning\"}]},\"privateEndpointConnections\":[{\"properties\":{\"provisioningState\":\"Pending\",\"privateEndpoint\":{\"id\":\"c\"},\"privateLinkServiceConnectionState\":{\"status\":\"Pending\",\"description\":\"fnljky\",\"actionsRequired\":\"j\"},\"groupIds\":[\"j\",\"gidokgjljyoxgvcl\"]},\"id\":\"gsncghkjeszz\",\"name\":\"bijhtxfvgxbf\",\"type\":\"mxnehmp\"},{\"properties\":{\"provisioningState\":\"Failed\",\"privateEndpoint\":{\"id\":\"odebfqkkrbmpu\"},\"privateLinkServiceConnectionState\":{\"status\":\"Failed\",\"description\":\"wflzlfbxzpuzy\",\"actionsRequired\":\"spnqzahmgkb\"},\"groupIds\":[\"y\",\"hibnuqqkpika\",\"rgvtqag\"]},\"id\":\"uynhijg\",\"name\":\"mebf\",\"type\":\"iarbutrcvpna\"},{\"properties\":{\"provisioningState\":\"Deleting\",\"privateEndpoint\":{\"id\":\"runmp\"},\"privateLinkServiceConnectionState\":{\"status\":\"Failed\",\"description\":\"bh\",\"actionsRequired\":\"nlankxmyskpb\"},\"groupIds\":[\"btkcxywnytnrsyn\",\"qidybyx\",\"zfcl\",\"aaxdbabphlwrq\"]},\"id\":\"ktsthsucocmny\",\"name\":\"azt\",\"type\":\"bt\"}]}")
                .toObject(VolumeGroupProperties.class);
        Assertions.assertEquals(StorageTargetType.ISCSI, model.protocolType());
        Assertions.assertEquals(EncryptionType.ENCRYPTION_AT_REST_WITH_PLATFORM_KEY, model.encryption());
        Assertions.assertEquals("q", model.networkAcls().virtualNetworkRules().get(0).virtualNetworkResourceId());
        Assertions.assertEquals(Action.ALLOW, model.networkAcls().virtualNetworkRules().get(0).action());
    }

    @org.junit.jupiter.api.Test
    public void testSerialize() throws Exception {
        VolumeGroupProperties model =
            new VolumeGroupProperties()
                .withProtocolType(StorageTargetType.ISCSI)
                .withEncryption(EncryptionType.ENCRYPTION_AT_REST_WITH_PLATFORM_KEY)
                .withNetworkAcls(
                    new NetworkRuleSet()
                        .withVirtualNetworkRules(
                            Arrays
                                .asList(
                                    new VirtualNetworkRule().withVirtualNetworkResourceId("q").withAction(Action.ALLOW),
                                    new VirtualNetworkRule()
                                        .withVirtualNetworkResourceId("lihkaetcktvfc")
                                        .withAction(Action.ALLOW),
                                    new VirtualNetworkRule()
                                        .withVirtualNetworkResourceId("kymuctqhjfbebr")
                                        .withAction(Action.ALLOW),
                                    new VirtualNetworkRule()
                                        .withVirtualNetworkResourceId("fuwutttxf")
                                        .withAction(Action.ALLOW))));
        model = BinaryData.fromObject(model).toObject(VolumeGroupProperties.class);
        Assertions.assertEquals(StorageTargetType.ISCSI, model.protocolType());
        Assertions.assertEquals(EncryptionType.ENCRYPTION_AT_REST_WITH_PLATFORM_KEY, model.encryption());
        Assertions.assertEquals("q", model.networkAcls().virtualNetworkRules().get(0).virtualNetworkResourceId());
        Assertions.assertEquals(Action.ALLOW, model.networkAcls().virtualNetworkRules().get(0).action());
    }
}

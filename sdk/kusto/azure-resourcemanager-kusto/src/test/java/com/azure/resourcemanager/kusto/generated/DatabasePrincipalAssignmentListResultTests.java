// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) AutoRest Code Generator.

package com.azure.resourcemanager.kusto.generated;

import com.azure.core.util.BinaryData;
import com.azure.resourcemanager.kusto.fluent.models.DatabasePrincipalAssignmentInner;
import com.azure.resourcemanager.kusto.models.DatabasePrincipalAssignmentListResult;
import com.azure.resourcemanager.kusto.models.DatabasePrincipalRole;
import com.azure.resourcemanager.kusto.models.PrincipalType;
import java.util.Arrays;
import org.junit.jupiter.api.Assertions;

public final class DatabasePrincipalAssignmentListResultTests {
    @org.junit.jupiter.api.Test
    public void testDeserialize() throws Exception {
        DatabasePrincipalAssignmentListResult model =
            BinaryData
                .fromString(
                    "{\"value\":[{\"properties\":{\"principalId\":\"dahzxctobg\",\"role\":\"Ingestor\",\"tenantId\":\"moizpos\",\"principalType\":\"Group\",\"tenantName\":\"rcfbunrm\",\"principalName\":\"jhhkxbp\",\"provisioningState\":\"Running\",\"aadObjectId\":\"jhxxjyn\"},\"id\":\"u\",\"name\":\"ivkrtsw\",\"type\":\"xqzvszjfa\"},{\"properties\":{\"principalId\":\"j\",\"role\":\"User\",\"tenantId\":\"xivetvt\",\"principalType\":\"User\",\"tenantName\":\"qtdo\",\"principalName\":\"cbxvwvxyslqbh\",\"provisioningState\":\"Succeeded\",\"aadObjectId\":\"blytk\"},\"id\":\"lmpewwwfbkr\",\"name\":\"rn\",\"type\":\"vshqjohxcr\"},{\"properties\":{\"principalId\":\"fovasr\",\"role\":\"Viewer\",\"tenantId\":\"wbhsqfsub\",\"principalType\":\"App\",\"tenantName\":\"birx\",\"principalName\":\"ybsrfbjfdtwss\",\"provisioningState\":\"Running\",\"aadObjectId\":\"pvjzbe\"},\"id\":\"ilzznfqqnvwp\",\"name\":\"qtaruoujmkcjhwq\",\"type\":\"tjrybnwjewgdr\"},{\"properties\":{\"principalId\":\"rvnaenqpeh\",\"role\":\"UnrestrictedViewer\",\"tenantId\":\"oygmift\",\"principalType\":\"Group\",\"tenantName\":\"d\",\"principalName\":\"sl\",\"provisioningState\":\"Canceled\",\"aadObjectId\":\"qig\"},\"id\":\"nduhavhqlkthum\",\"name\":\"qolbgyc\",\"type\":\"uie\"}]}")
                .toObject(DatabasePrincipalAssignmentListResult.class);
        Assertions.assertEquals("dahzxctobg", model.value().get(0).principalId());
        Assertions.assertEquals(DatabasePrincipalRole.INGESTOR, model.value().get(0).role());
        Assertions.assertEquals("moizpos", model.value().get(0).tenantId());
        Assertions.assertEquals(PrincipalType.GROUP, model.value().get(0).principalType());
    }

    @org.junit.jupiter.api.Test
    public void testSerialize() throws Exception {
        DatabasePrincipalAssignmentListResult model =
            new DatabasePrincipalAssignmentListResult()
                .withValue(
                    Arrays
                        .asList(
                            new DatabasePrincipalAssignmentInner()
                                .withPrincipalId("dahzxctobg")
                                .withRole(DatabasePrincipalRole.INGESTOR)
                                .withTenantId("moizpos")
                                .withPrincipalType(PrincipalType.GROUP),
                            new DatabasePrincipalAssignmentInner()
                                .withPrincipalId("j")
                                .withRole(DatabasePrincipalRole.USER)
                                .withTenantId("xivetvt")
                                .withPrincipalType(PrincipalType.USER),
                            new DatabasePrincipalAssignmentInner()
                                .withPrincipalId("fovasr")
                                .withRole(DatabasePrincipalRole.VIEWER)
                                .withTenantId("wbhsqfsub")
                                .withPrincipalType(PrincipalType.APP),
                            new DatabasePrincipalAssignmentInner()
                                .withPrincipalId("rvnaenqpeh")
                                .withRole(DatabasePrincipalRole.UNRESTRICTED_VIEWER)
                                .withTenantId("oygmift")
                                .withPrincipalType(PrincipalType.GROUP)));
        model = BinaryData.fromObject(model).toObject(DatabasePrincipalAssignmentListResult.class);
        Assertions.assertEquals("dahzxctobg", model.value().get(0).principalId());
        Assertions.assertEquals(DatabasePrincipalRole.INGESTOR, model.value().get(0).role());
        Assertions.assertEquals("moizpos", model.value().get(0).tenantId());
        Assertions.assertEquals(PrincipalType.GROUP, model.value().get(0).principalType());
    }
}

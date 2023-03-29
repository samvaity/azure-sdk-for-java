package com.azure.core.test;

import com.azure.core.credential.TokenCredential;
import com.azure.core.http.policy.HttpLogDetailLevel;
import com.azure.core.http.policy.HttpLogOptions;
import com.azure.core.util.Configuration;
import com.azure.data.tables.TableClient;
import com.azure.data.tables.TableClientBuilder;
import com.azure.identity.ClientSecretCredential;
import com.azure.identity.ClientSecretCredentialBuilder;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertNotNull;

public class TestClientBuilder extends TestProxyTestBase {

    @Test
    public void testClientSecretCredential() {
        final ClientSecretCredential credential = new ClientSecretCredentialBuilder()
            .clientId(Configuration.getGlobalConfiguration().get("TABLES_CLIENT_ID", "clientId"))
            .clientSecret(Configuration.getGlobalConfiguration().get("TABLES_CLIENT_SECRET", "clientSecret"))
            .tenantId(Configuration.getGlobalConfiguration().get("TABLES_TENANT_ID", "tenantId"))
            .additionallyAllowedTenants("*")
            .build();

        final TableClient tableClient2 =
            getClientBuilder("tableName214", Configuration.getGlobalConfiguration().get("TABLES_ENDPOINT",
                "https://tablestests.table.core.windows.com"), credential, true).buildClient();

        // Act & Assert
        // This request will use the tenant ID extracted from the previous request.
        assertNotNull(tableClient2.createTable());
    }

    protected TableClientBuilder getClientBuilder(String tableName, String endpoint, TokenCredential tokenCredential,
                                                  boolean enableTenantDiscovery) {
        final TableClientBuilder tableClientBuilder = new TableClientBuilder()
            .credential(tokenCredential)
            .endpoint(endpoint)
            .addPolicy(interceptorManager.getRecordPolicy());

        if (enableTenantDiscovery) {
            tableClientBuilder.enableTenantDiscovery();
        }

        return configureTestClientBuilder(tableClientBuilder, tableName);
    }

    private TableClientBuilder configureTestClientBuilder(TableClientBuilder tableClientBuilder, String tableName) {
        tableClientBuilder
            .httpLogOptions(new HttpLogOptions().setLogLevel(HttpLogDetailLevel.BODY_AND_HEADERS))
            .tableName(tableName);
        return tableClientBuilder;
    }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) AutoRest Code Generator.

package com.azure.resourcemanager.webpubsub.generated;

import com.azure.core.util.BinaryData;
import com.azure.resourcemanager.webpubsub.fluent.models.WebPubSubProperties;
import com.azure.resourcemanager.webpubsub.models.AclAction;
import com.azure.resourcemanager.webpubsub.models.LiveTraceCategory;
import com.azure.resourcemanager.webpubsub.models.LiveTraceConfiguration;
import com.azure.resourcemanager.webpubsub.models.NetworkAcl;
import com.azure.resourcemanager.webpubsub.models.PrivateEndpointAcl;
import com.azure.resourcemanager.webpubsub.models.ResourceLogCategory;
import com.azure.resourcemanager.webpubsub.models.ResourceLogConfiguration;
import com.azure.resourcemanager.webpubsub.models.WebPubSubNetworkACLs;
import com.azure.resourcemanager.webpubsub.models.WebPubSubRequestType;
import com.azure.resourcemanager.webpubsub.models.WebPubSubTlsSettings;
import java.util.Arrays;
import org.junit.jupiter.api.Assertions;

public final class WebPubSubPropertiesTests {
    @org.junit.jupiter.api.Test
    public void testDeserialize() throws Exception {
        WebPubSubProperties model =
            BinaryData
                .fromString(
                    "{\"provisioningState\":\"Failed\",\"externalIP\":\"ljphuopxodl\",\"hostName\":\"ynt\",\"publicPort\":863114887,\"serverPort\":1915861757,\"version\":\"eosjswsr\",\"privateEndpointConnections\":[{\"properties\":{\"provisioningState\":\"Creating\",\"privateEndpoint\":{\"id\":\"bchckqqzqio\"},\"groupIds\":[\"suiizynkedyat\",\"wyhqmibzyhwits\",\"ypyynpcdpumnzg\",\"wznm\"],\"privateLinkServiceConnectionState\":{\"status\":\"Pending\",\"description\":\"sorgj\",\"actionsRequired\":\"bldtlww\"}},\"id\":\"kdmtncvokotll\",\"name\":\"d\",\"type\":\"h\"},{\"properties\":{\"provisioningState\":\"Unknown\",\"privateEndpoint\":{\"id\":\"gjltdtbnnhado\"},\"groupIds\":[\"kvci\",\"hnvpamqgxq\",\"u\"],\"privateLinkServiceConnectionState\":{\"status\":\"Disconnected\",\"description\":\"wggxkallat\",\"actionsRequired\":\"lwuip\"}},\"id\":\"cjzkzivgvvcna\",\"name\":\"rhyrnxxmueed\",\"type\":\"drd\"},{\"properties\":{\"provisioningState\":\"Moving\",\"privateEndpoint\":{\"id\":\"qtc\"},\"groupIds\":[\"lmfmtdaay\"],\"privateLinkServiceConnectionState\":{\"status\":\"Approved\",\"description\":\"gpiohgwxrtfudxe\",\"actionsRequired\":\"gyqagvrvmnpkuk\"}},\"id\":\"i\",\"name\":\"dblx\",\"type\":\"wi\"},{\"properties\":{\"provisioningState\":\"Running\",\"privateEndpoint\":{\"id\":\"j\"},\"groupIds\":[\"szkkfoqre\",\"fkzikfj\"],\"privateLinkServiceConnectionState\":{\"status\":\"Rejected\",\"description\":\"ivx\",\"actionsRequired\":\"zel\"}},\"id\":\"irels\",\"name\":\"eae\",\"type\":\"wabfatkl\"}],\"sharedPrivateLinkResources\":[{\"properties\":{\"groupId\":\"jhwuaanozjos\",\"privateLinkResourceId\":\"hyoulpjr\",\"provisioningState\":\"Unknown\",\"requestMessage\":\"l\",\"status\":\"Rejected\"},\"id\":\"mjwosytx\",\"name\":\"tcs\",\"type\":\"fcktqumiekke\"},{\"properties\":{\"groupId\":\"ikh\",\"privateLinkResourceId\":\"yf\",\"provisioningState\":\"Deleting\",\"requestMessage\":\"qgge\",\"status\":\"Rejected\"},\"id\":\"nyga\",\"name\":\"qidbqfatpxllrxcy\",\"type\":\"moadsuvarmy\"},{\"properties\":{\"groupId\":\"mjsjqb\",\"privateLinkResourceId\":\"hhyxxrw\",\"provisioningState\":\"Unknown\",\"requestMessage\":\"duhpk\",\"status\":\"Rejected\"},\"id\":\"ymareqnajxqugj\",\"name\":\"ky\",\"type\":\"ubeddg\"},{\"properties\":{\"groupId\":\"ofwq\",\"privateLinkResourceId\":\"zqalkrmnjijpx\",\"provisioningState\":\"Succeeded\",\"requestMessage\":\"udfnbyxba\",\"status\":\"Approved\"},\"id\":\"jyvayffimrzrtuz\",\"name\":\"ogs\",\"type\":\"xnevfdnwn\"}],\"tls\":{\"clientCertEnabled\":true},\"hostNamePrefix\":\"syyceuzsoibjud\",\"liveTraceConfiguration\":{\"enabled\":\"xtrthz\",\"categories\":[{\"name\":\"dwkqbrq\",\"enabled\":\"paxh\"}]},\"resourceLogConfiguration\":{\"categories\":[{\"name\":\"ivpdtiir\",\"enabled\":\"d\"}]},\"networkACLs\":{\"defaultAction\":\"Deny\",\"publicNetwork\":{\"allow\":[\"ClientConnection\"],\"deny\":[\"RESTAPI\",\"ServerConnection\",\"Trace\",\"ServerConnection\"]},\"privateEndpoints\":[{\"name\":\"rxxle\",\"allow\":[\"RESTAPI\",\"ServerConnection\",\"ClientConnection\"],\"deny\":[\"ClientConnection\"]},{\"name\":\"wlwnwxuqlcv\",\"allow\":[\"Trace\",\"Trace\",\"ServerConnection\",\"Trace\"],\"deny\":[\"RESTAPI\"]}]},\"publicNetworkAccess\":\"jkniodko\",\"disableLocalAuth\":false,\"disableAadAuth\":false}")
                .toObject(WebPubSubProperties.class);
        Assertions.assertEquals(true, model.tls().clientCertEnabled());
        Assertions.assertEquals("xtrthz", model.liveTraceConfiguration().enabled());
        Assertions.assertEquals("dwkqbrq", model.liveTraceConfiguration().categories().get(0).name());
        Assertions.assertEquals("paxh", model.liveTraceConfiguration().categories().get(0).enabled());
        Assertions.assertEquals("ivpdtiir", model.resourceLogConfiguration().categories().get(0).name());
        Assertions.assertEquals("d", model.resourceLogConfiguration().categories().get(0).enabled());
        Assertions.assertEquals(AclAction.DENY, model.networkACLs().defaultAction());
        Assertions
            .assertEquals(WebPubSubRequestType.CLIENT_CONNECTION, model.networkACLs().publicNetwork().allow().get(0));
        Assertions.assertEquals(WebPubSubRequestType.RESTAPI, model.networkACLs().publicNetwork().deny().get(0));
        Assertions
            .assertEquals(WebPubSubRequestType.RESTAPI, model.networkACLs().privateEndpoints().get(0).allow().get(0));
        Assertions
            .assertEquals(
                WebPubSubRequestType.CLIENT_CONNECTION, model.networkACLs().privateEndpoints().get(0).deny().get(0));
        Assertions.assertEquals("rxxle", model.networkACLs().privateEndpoints().get(0).name());
        Assertions.assertEquals("jkniodko", model.publicNetworkAccess());
        Assertions.assertEquals(false, model.disableLocalAuth());
        Assertions.assertEquals(false, model.disableAadAuth());
    }

    @org.junit.jupiter.api.Test
    public void testSerialize() throws Exception {
        WebPubSubProperties model =
            new WebPubSubProperties()
                .withTls(new WebPubSubTlsSettings().withClientCertEnabled(true))
                .withLiveTraceConfiguration(
                    new LiveTraceConfiguration()
                        .withEnabled("xtrthz")
                        .withCategories(Arrays.asList(new LiveTraceCategory().withName("dwkqbrq").withEnabled("paxh"))))
                .withResourceLogConfiguration(
                    new ResourceLogConfiguration()
                        .withCategories(Arrays.asList(new ResourceLogCategory().withName("ivpdtiir").withEnabled("d"))))
                .withNetworkACLs(
                    new WebPubSubNetworkACLs()
                        .withDefaultAction(AclAction.DENY)
                        .withPublicNetwork(
                            new NetworkAcl()
                                .withAllow(Arrays.asList(WebPubSubRequestType.CLIENT_CONNECTION))
                                .withDeny(
                                    Arrays
                                        .asList(
                                            WebPubSubRequestType.RESTAPI,
                                            WebPubSubRequestType.SERVER_CONNECTION,
                                            WebPubSubRequestType.TRACE,
                                            WebPubSubRequestType.SERVER_CONNECTION)))
                        .withPrivateEndpoints(
                            Arrays
                                .asList(
                                    new PrivateEndpointAcl()
                                        .withAllow(
                                            Arrays
                                                .asList(
                                                    WebPubSubRequestType.RESTAPI,
                                                    WebPubSubRequestType.SERVER_CONNECTION,
                                                    WebPubSubRequestType.CLIENT_CONNECTION))
                                        .withDeny(Arrays.asList(WebPubSubRequestType.CLIENT_CONNECTION))
                                        .withName("rxxle"),
                                    new PrivateEndpointAcl()
                                        .withAllow(
                                            Arrays
                                                .asList(
                                                    WebPubSubRequestType.TRACE,
                                                    WebPubSubRequestType.TRACE,
                                                    WebPubSubRequestType.SERVER_CONNECTION,
                                                    WebPubSubRequestType.TRACE))
                                        .withDeny(Arrays.asList(WebPubSubRequestType.RESTAPI))
                                        .withName("wlwnwxuqlcv"))))
                .withPublicNetworkAccess("jkniodko")
                .withDisableLocalAuth(false)
                .withDisableAadAuth(false);
        model = BinaryData.fromObject(model).toObject(WebPubSubProperties.class);
        Assertions.assertEquals(true, model.tls().clientCertEnabled());
        Assertions.assertEquals("xtrthz", model.liveTraceConfiguration().enabled());
        Assertions.assertEquals("dwkqbrq", model.liveTraceConfiguration().categories().get(0).name());
        Assertions.assertEquals("paxh", model.liveTraceConfiguration().categories().get(0).enabled());
        Assertions.assertEquals("ivpdtiir", model.resourceLogConfiguration().categories().get(0).name());
        Assertions.assertEquals("d", model.resourceLogConfiguration().categories().get(0).enabled());
        Assertions.assertEquals(AclAction.DENY, model.networkACLs().defaultAction());
        Assertions
            .assertEquals(WebPubSubRequestType.CLIENT_CONNECTION, model.networkACLs().publicNetwork().allow().get(0));
        Assertions.assertEquals(WebPubSubRequestType.RESTAPI, model.networkACLs().publicNetwork().deny().get(0));
        Assertions
            .assertEquals(WebPubSubRequestType.RESTAPI, model.networkACLs().privateEndpoints().get(0).allow().get(0));
        Assertions
            .assertEquals(
                WebPubSubRequestType.CLIENT_CONNECTION, model.networkACLs().privateEndpoints().get(0).deny().get(0));
        Assertions.assertEquals("rxxle", model.networkACLs().privateEndpoints().get(0).name());
        Assertions.assertEquals("jkniodko", model.publicNetworkAccess());
        Assertions.assertEquals(false, model.disableLocalAuth());
        Assertions.assertEquals(false, model.disableAadAuth());
    }
}

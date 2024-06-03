// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.data.appconfiguration.implementation;

import com.azure.data.appconfiguration.implementation.models.KeyValue;
import com.azure.data.appconfiguration.implementation.models.SnapshotUpdateParameters;
import com.azure.data.appconfiguration.implementation.models.UpdateSnapshotHeaders;
import com.azure.data.appconfiguration.models.ConfigurationSetting;
import com.azure.data.appconfiguration.models.ConfigurationSnapshot;
import com.azure.data.appconfiguration.models.SettingFields;
import io.clientcore.core.http.models.Response;
import io.clientcore.core.util.Context;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

/**
 * App Configuration Utility methods, use internally.
 */
public class Utility {
    public static final String ID = "id";
    public static final String DESCRIPTION = "description";
    public static final String DISPLAY_NAME = "display_name";
    public static final String ENABLED = "enabled";
    public static final String CONDITIONS = "conditions";
    public static final String CLIENT_FILTERS = "client_filters";
    public static final String NAME = "name";
    public static final String PARAMETERS = "parameters";
    public static final String URI = "uri";

    /**
     * Represents any value in Etag.
     */
    public static final String ETAG_ANY = "*";

    /*
     * Translate public ConfigurationSetting to KeyValue autorest generated class.
     */
    public static KeyValue toKeyValue(ConfigurationSetting setting) {
        return new KeyValue()
                   .setKey(setting.getKey())
                   .setValue(setting.getValue())
                   .setLabel(setting.getLabel())
                   .setContentType(setting.getContentType())
                   .setEtag(setting.getETag())
                   .setLastModified(setting.getLastModified())
                   .setLocked(setting.isReadOnly())
                   .setTags(setting.getTags());
    }

    // SettingFields[] to List<SettingFields>
    public static List<SettingFields> toSettingFieldsList(SettingFields[] settingFieldsArray) {
        return new ArrayList<>(Arrays.asList(settingFieldsArray));
    }

    /*
     * Azure Configuration service requires that the ETag value is surrounded in quotation marks.
     *
     * @param ETag The ETag to get the value for. If null is pass in, an empty string is returned.
     * @return The ETag surrounded by quotations. (ex. "ETag")
     */
    private static String getETagValue(String etag) {
        return (etag == null || "*".equals(etag)) ? etag : "\"" + etag + "\"";
    }

    /*
     * Get HTTP header value, if-match or if-none-match.. Used to perform an operation only if the targeted resource's
     * etag matches the value provided.
     */
    public static String getETag(boolean isETagRequired, ConfigurationSetting setting) {
        return isETagRequired ? getETagValue(setting.getETag()) : null;
    }

    /*
     * Ensure that setting is not null. And, key cannot be null because it is part of the service REST URL.
     */
    public static void validateSetting(ConfigurationSetting setting) {
        Objects.requireNonNull(setting);

        if (setting.getKey() == null) {
            throw new IllegalArgumentException("Parameter 'key' is required and cannot be null.");
        }
    }

    public static Response<ConfigurationSnapshot> updateSnapshotSync(String snapshotName,
                                                                     AzureAppConfigurationImpl serviceClient, Context context) {
//        final String ifMatch = matchConditions == null ? null : matchConditions.getIfMatch();

        final ResponseBase<UpdateSnapshotHeaders, ConfigurationSnapshot> response =
            serviceClient.updateSnapshotWithResponse(snapshotName,
                new SnapshotUpdateParameters().setStatus(status), null, null, context);
        return new SimpleResponse<>(response, response.getValue());
    }


    // Parse the next link from the link header, if it exists. And return the continuation token url without the "<" and ">"
    public static String parseNextLink(String nextLink) {
        // actual value of next link: </kv?api-version=2023-10-01&$Select=&after=a2V5MTg4Cg%3D%3D>; rel="next"
        // The format of nextLink is always: "<url>; rel="next"", so we need to remove the "<" and ">" and the "; rel="next""
        if (nextLink == null) {
            return null;
        }
        String[] parts = nextLink.split(";");

        return parts[0].substring(1, parts[0].length() - 1);
    }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
// Code generated by Microsoft (R) AutoRest Code Generator.

package com.azure.resourcemanager.networkcloud.fluent.models;

import com.azure.core.annotation.Fluent;
import com.azure.core.management.Resource;
import com.azure.core.management.SystemData;
import com.azure.core.util.logging.ClientLogger;
import com.azure.resourcemanager.networkcloud.models.BareMetalMachineKeySetDetailedStatus;
import com.azure.resourcemanager.networkcloud.models.BareMetalMachineKeySetPrivilegeLevel;
import com.azure.resourcemanager.networkcloud.models.BareMetalMachineKeySetProvisioningState;
import com.azure.resourcemanager.networkcloud.models.ExtendedLocation;
import com.azure.resourcemanager.networkcloud.models.KeySetUser;
import com.azure.resourcemanager.networkcloud.models.KeySetUserStatus;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/** BareMetalMachineKeySet represents the bare metal machine key set. */
@Fluent
public final class BareMetalMachineKeySetInner extends Resource {
    /*
     * ExtendedLocation represents the Azure custom location where the resource will be created.
     *
     * The extended location of the cluster associated with the resource.
     */
    @JsonProperty(value = "extendedLocation", required = true)
    private ExtendedLocation extendedLocation;

    /*
     * BareMetalMachineKeySetProperties represents the properties of bare metal machine key set.
     *
     * The list of the resource properties.
     */
    @JsonProperty(value = "properties", required = true)
    private BareMetalMachineKeySetProperties innerProperties = new BareMetalMachineKeySetProperties();

    /*
     * Azure Resource Manager metadata containing createdBy and modifiedBy information.
     */
    @JsonProperty(value = "systemData", access = JsonProperty.Access.WRITE_ONLY)
    private SystemData systemData;

    /** Creates an instance of BareMetalMachineKeySetInner class. */
    public BareMetalMachineKeySetInner() {
    }

    /**
     * Get the extendedLocation property: ExtendedLocation represents the Azure custom location where the resource will
     * be created.
     *
     * <p>The extended location of the cluster associated with the resource.
     *
     * @return the extendedLocation value.
     */
    public ExtendedLocation extendedLocation() {
        return this.extendedLocation;
    }

    /**
     * Set the extendedLocation property: ExtendedLocation represents the Azure custom location where the resource will
     * be created.
     *
     * <p>The extended location of the cluster associated with the resource.
     *
     * @param extendedLocation the extendedLocation value to set.
     * @return the BareMetalMachineKeySetInner object itself.
     */
    public BareMetalMachineKeySetInner withExtendedLocation(ExtendedLocation extendedLocation) {
        this.extendedLocation = extendedLocation;
        return this;
    }

    /**
     * Get the innerProperties property: BareMetalMachineKeySetProperties represents the properties of bare metal
     * machine key set.
     *
     * <p>The list of the resource properties.
     *
     * @return the innerProperties value.
     */
    private BareMetalMachineKeySetProperties innerProperties() {
        return this.innerProperties;
    }

    /**
     * Get the systemData property: Azure Resource Manager metadata containing createdBy and modifiedBy information.
     *
     * @return the systemData value.
     */
    public SystemData systemData() {
        return this.systemData;
    }

    /** {@inheritDoc} */
    @Override
    public BareMetalMachineKeySetInner withLocation(String location) {
        super.withLocation(location);
        return this;
    }

    /** {@inheritDoc} */
    @Override
    public BareMetalMachineKeySetInner withTags(Map<String, String> tags) {
        super.withTags(tags);
        return this;
    }

    /**
     * Get the azureGroupId property: The object ID of Azure Active Directory group that all users in the list must be
     * in for access to be granted. Users that are not in the group will not have access.
     *
     * @return the azureGroupId value.
     */
    public String azureGroupId() {
        return this.innerProperties() == null ? null : this.innerProperties().azureGroupId();
    }

    /**
     * Set the azureGroupId property: The object ID of Azure Active Directory group that all users in the list must be
     * in for access to be granted. Users that are not in the group will not have access.
     *
     * @param azureGroupId the azureGroupId value to set.
     * @return the BareMetalMachineKeySetInner object itself.
     */
    public BareMetalMachineKeySetInner withAzureGroupId(String azureGroupId) {
        if (this.innerProperties() == null) {
            this.innerProperties = new BareMetalMachineKeySetProperties();
        }
        this.innerProperties().withAzureGroupId(azureGroupId);
        return this;
    }

    /**
     * Get the detailedStatus property: The more detailed status of the key set.
     *
     * @return the detailedStatus value.
     */
    public BareMetalMachineKeySetDetailedStatus detailedStatus() {
        return this.innerProperties() == null ? null : this.innerProperties().detailedStatus();
    }

    /**
     * Get the detailedStatusMessage property: The descriptive message about the current detailed status.
     *
     * @return the detailedStatusMessage value.
     */
    public String detailedStatusMessage() {
        return this.innerProperties() == null ? null : this.innerProperties().detailedStatusMessage();
    }

    /**
     * Get the expiration property: The date and time after which the users in this key set will be removed from the
     * bare metal machines.
     *
     * @return the expiration value.
     */
    public OffsetDateTime expiration() {
        return this.innerProperties() == null ? null : this.innerProperties().expiration();
    }

    /**
     * Set the expiration property: The date and time after which the users in this key set will be removed from the
     * bare metal machines.
     *
     * @param expiration the expiration value to set.
     * @return the BareMetalMachineKeySetInner object itself.
     */
    public BareMetalMachineKeySetInner withExpiration(OffsetDateTime expiration) {
        if (this.innerProperties() == null) {
            this.innerProperties = new BareMetalMachineKeySetProperties();
        }
        this.innerProperties().withExpiration(expiration);
        return this;
    }

    /**
     * Get the jumpHostsAllowed property: The list of IP addresses of jump hosts with management network access from
     * which a login will be allowed for the users.
     *
     * @return the jumpHostsAllowed value.
     */
    public List<String> jumpHostsAllowed() {
        return this.innerProperties() == null ? null : this.innerProperties().jumpHostsAllowed();
    }

    /**
     * Set the jumpHostsAllowed property: The list of IP addresses of jump hosts with management network access from
     * which a login will be allowed for the users.
     *
     * @param jumpHostsAllowed the jumpHostsAllowed value to set.
     * @return the BareMetalMachineKeySetInner object itself.
     */
    public BareMetalMachineKeySetInner withJumpHostsAllowed(List<String> jumpHostsAllowed) {
        if (this.innerProperties() == null) {
            this.innerProperties = new BareMetalMachineKeySetProperties();
        }
        this.innerProperties().withJumpHostsAllowed(jumpHostsAllowed);
        return this;
    }

    /**
     * Get the lastValidation property: The last time this key set was validated.
     *
     * @return the lastValidation value.
     */
    public OffsetDateTime lastValidation() {
        return this.innerProperties() == null ? null : this.innerProperties().lastValidation();
    }

    /**
     * Get the osGroupName property: The name of the group that users will be assigned to on the operating system of the
     * machines.
     *
     * @return the osGroupName value.
     */
    public String osGroupName() {
        return this.innerProperties() == null ? null : this.innerProperties().osGroupName();
    }

    /**
     * Set the osGroupName property: The name of the group that users will be assigned to on the operating system of the
     * machines.
     *
     * @param osGroupName the osGroupName value to set.
     * @return the BareMetalMachineKeySetInner object itself.
     */
    public BareMetalMachineKeySetInner withOsGroupName(String osGroupName) {
        if (this.innerProperties() == null) {
            this.innerProperties = new BareMetalMachineKeySetProperties();
        }
        this.innerProperties().withOsGroupName(osGroupName);
        return this;
    }

    /**
     * Get the privilegeLevel property: The access level allowed for the users in this key set.
     *
     * @return the privilegeLevel value.
     */
    public BareMetalMachineKeySetPrivilegeLevel privilegeLevel() {
        return this.innerProperties() == null ? null : this.innerProperties().privilegeLevel();
    }

    /**
     * Set the privilegeLevel property: The access level allowed for the users in this key set.
     *
     * @param privilegeLevel the privilegeLevel value to set.
     * @return the BareMetalMachineKeySetInner object itself.
     */
    public BareMetalMachineKeySetInner withPrivilegeLevel(BareMetalMachineKeySetPrivilegeLevel privilegeLevel) {
        if (this.innerProperties() == null) {
            this.innerProperties = new BareMetalMachineKeySetProperties();
        }
        this.innerProperties().withPrivilegeLevel(privilegeLevel);
        return this;
    }

    /**
     * Get the provisioningState property: The provisioning state of the bare metal machine key set.
     *
     * @return the provisioningState value.
     */
    public BareMetalMachineKeySetProvisioningState provisioningState() {
        return this.innerProperties() == null ? null : this.innerProperties().provisioningState();
    }

    /**
     * Get the userList property: The unique list of permitted users.
     *
     * @return the userList value.
     */
    public List<KeySetUser> userList() {
        return this.innerProperties() == null ? null : this.innerProperties().userList();
    }

    /**
     * Set the userList property: The unique list of permitted users.
     *
     * @param userList the userList value to set.
     * @return the BareMetalMachineKeySetInner object itself.
     */
    public BareMetalMachineKeySetInner withUserList(List<KeySetUser> userList) {
        if (this.innerProperties() == null) {
            this.innerProperties = new BareMetalMachineKeySetProperties();
        }
        this.innerProperties().withUserList(userList);
        return this;
    }

    /**
     * Get the userListStatus property: The status evaluation of each user.
     *
     * @return the userListStatus value.
     */
    public List<KeySetUserStatus> userListStatus() {
        return this.innerProperties() == null ? null : this.innerProperties().userListStatus();
    }

    /**
     * Validates the instance.
     *
     * @throws IllegalArgumentException thrown if the instance is not valid.
     */
    public void validate() {
        if (extendedLocation() == null) {
            throw LOGGER
                .logExceptionAsError(
                    new IllegalArgumentException(
                        "Missing required property extendedLocation in model BareMetalMachineKeySetInner"));
        } else {
            extendedLocation().validate();
        }
        if (innerProperties() == null) {
            throw LOGGER
                .logExceptionAsError(
                    new IllegalArgumentException(
                        "Missing required property innerProperties in model BareMetalMachineKeySetInner"));
        } else {
            innerProperties().validate();
        }
    }

    private static final ClientLogger LOGGER = new ClientLogger(BareMetalMachineKeySetInner.class);
}
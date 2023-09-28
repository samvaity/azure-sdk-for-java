// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.typespec.core.credential;

/**
 * Codesnippets for {@link TypeSpecNamedKeyCredential}.
 */
public class TypeSpecNamedKeyCredentialJavadocCodeSnippets {

    public void TypeSpecNamedKeyCredenialSasKey() {
        // BEGIN: com.typespec.core.credential.TypeSpecNamedKeyCredenialSasKey
        TypeSpecNamedKeyCredential TypeSpecNamedKeyCredential =
            new TypeSpecNamedKeyCredential("TypeSpec-SERVICE-SAS-KEY-NAME", "TypeSpec-SERVICE-SAS-KEY");
        // END: com.typespec.core.credential.TypeSpecNamedKeyCredenialSasKey
    }
}

// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

package com.azure.ai.formrecognizer.implementation.util;

import com.azure.ai.formrecognizer.models.BoundingRegion;
import com.azure.ai.formrecognizer.models.DocumentFieldType;
import com.azure.ai.formrecognizer.models.DocumentSpan;
import com.azure.ai.formrecognizer.models.TypedDocumentField;

import java.util.List;

/**
 * The helper class to set the non-public properties of an {@link TypedDocumentField} instance.
 */
public final class DocumentFieldHelper {
    private static DocumentFieldHelper.DocumentFieldAccessor accessor;

    private DocumentFieldHelper() {
    }

    /**
     * Type defining the methods to set the non-public properties of an {@link TypedDocumentField} instance.
     */
    public interface DocumentFieldAccessor {
        void setType(TypedDocumentField documentField, DocumentFieldType type);

        void setContent(TypedDocumentField documentField, String content);

        void setBoundingRegions(TypedDocumentField documentField, List<BoundingRegion> boundingRegions);

        void setSpans(TypedDocumentField documentField, List<DocumentSpan> spans);

        void setConfidence(TypedDocumentField documentField, Float confidence);
    }

    /**
     * The method called from {@link TypedDocumentField} to set it's accessor.
     *
     * @param documentFieldAccessor The accessor.
     */
    public static void setAccessor(final DocumentFieldHelper.DocumentFieldAccessor documentFieldAccessor) {
        accessor = documentFieldAccessor;
    }

    static void setType(TypedDocumentField documentField, DocumentFieldType type) {
        accessor.setType(documentField, type);
    }

    static void setContent(TypedDocumentField documentField, String content) {
        accessor.setContent(documentField, content);
    }
    static void setBoundingRegions(TypedDocumentField documentField, List<BoundingRegion> boundingRegions) {
        accessor.setBoundingRegions(documentField, boundingRegions);
    }

    static void setSpans(TypedDocumentField documentField, List<DocumentSpan> spans) {
        accessor.setSpans(documentField, spans);
    }

    static void setConfidence(TypedDocumentField documentField, Float confidence) {
        accessor.setConfidence(documentField, confidence);
    }
}

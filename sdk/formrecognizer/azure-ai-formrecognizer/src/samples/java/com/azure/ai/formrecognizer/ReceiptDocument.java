package com.azure.ai.formrecognizer;

import com.azure.ai.formrecognizer.models.TypedDocumentField;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.time.LocalDate;
import java.util.List;

public class ReceiptDocument {

    public ReceiptDocument() {}

    @JsonProperty
    public TypedDocumentField<String> merchantName;

    @JsonProperty
    public TypedDocumentField<LocalDate> transactionDate;

    @JsonProperty
    public List<TypedDocumentField> items;

    public TypedDocumentField<String> getMerchantName() {
        return merchantName;
    }

    public TypedDocumentField<LocalDate> getTransactionDate() {
        return transactionDate;
    }

    public List<TypedDocumentField> getItems() {
        return items;
    }

    public void setMerchantName(TypedDocumentField merchantName) {
        this.merchantName = merchantName;
    }

    public void setTransactionDate(TypedDocumentField transactionDate) {
        this.transactionDate = transactionDate;
    }

    public void setItems(List<TypedDocumentField> items) {
        this.items = items;
    }
}

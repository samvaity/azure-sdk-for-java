package com.azure.ai.formrecognizer;

import com.azure.ai.formrecognizer.models.DocumentField;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

public class ReceiptDocument {

    public ReceiptDocument() {}

    @JsonProperty
    public DocumentField merchantName;

    @JsonProperty
    public DocumentField transactionDate;

    @JsonProperty
    public List<DocumentField> items;

    public DocumentField getMerchantName() {
        return merchantName;
    }

    public DocumentField getTransactionDate() {
        return transactionDate;
    }

    public List<DocumentField> getItems() {
        return items;
    }

    public void setMerchantName(DocumentField merchantName) {
        this.merchantName = merchantName;
    }

    public void setTransactionDate(DocumentField transactionDate) {
        this.transactionDate = transactionDate;
    }

    public void setItems(List<DocumentField> items) {
        this.items = items;
    }
}

// // Copyright (c) Microsoft Corporation. All rights reserved.
// // Licensed under the MIT License.
//
// package com.azure.ai.formrecognizer;
//
// import com.azure.ai.formrecognizer.models.AnalyzeResult;
// import com.azure.ai.formrecognizer.models.TypedDocumentField;
// import com.azure.ai.formrecognizer.models.DocumentFieldType;
// import com.azure.ai.formrecognizer.models.DocumentOperationResult;
// import com.azure.core.credential.AzureKeyCredential;
// import com.azure.core.util.polling.SyncPoller;
//
// import java.io.IOException;
// import java.time.LocalDate;
// import java.util.List;
//
// /**
//  * Sample for analyzing commonly found receipt fields from a local file input stream.
//  * See fields found on a receipt here:
//  * https://aka.ms/formrecognizer/receiptfields
//  */
// class AnalyzeReceipts {
//     public static void main(String[] args) {
//
//         DocumentAnalysisClient client = clientInitialization();
//
//         String modelId  = "custom-model-Id";
//         SyncPoller<DocumentOperationResult, AnalyzeResult> analyzeReceiptPoller
//             = client.beginAnalyzeDocumentFromUrl(modelId, "https://raw.githubusercontent.com/Azure/azure-sdk-for-java/main/sdk/formrecognizer/azure-ai-formrecognizer/src/test/resources/sample_files/Test/contoso-receipt.png");
//
//         AnalyzeResult analyzeResult = analyzeReceiptPoller.getFinalResult();
//
//         analyzeResult.getDocuments().forEach(analyzedDocument -> {
//             if (analyzedDocument.getDocType().equals(modelId)) {
//                 // get a pattern of is as.
//                 // follow JavaASTAnalyzer
//                 ReceiptDocument receiptDocument = null;
//                 try {
//                     receiptDocument = analyzedDocument.getDocumentAs(ReceiptDocument.class);
//                 } catch (IOException e) {
//                     e.printStackTrace();
//                 }
//                 System.out.println("----------- Analyzing receipt info -----------");
//                 TypedDocumentField merchantNameField = receiptDocument.getMerchantName();
//                 if (merchantNameField != null) {
//                     if (DocumentFieldType.STRING == merchantNameField.getType()) {
//                         String merchantName = merchantNameField.getValueString();
//                         System.out.printf("Merchant Name: %s, confidence: %.2f%n",
//                             merchantName, merchantNameField.getConfidence());
//                     }
//                 }
//
//                 TypedDocumentField transactionDateField = receiptDocument.getTransactionDate();
//                 if (transactionDateField != null) {
//                     if (DocumentFieldType.DATE == transactionDateField.getType()) {
//                         // LocalDate transactionDate = transactionDateField.getValueDate();
//                         // System.out.printf("Transaction Date: %s, confidence: %.2f%n",
//                         //     transactionDate, transactionDateField.getConfidence());
//                     }
//                 }
//             }
//         });
//     }
//
//     private static DocumentAnalysisClient clientInitialization() {
//         // Instantiate a client that will be used to call the service.
//         return new DocumentAnalysisClientBuilder()
//             .credential(new AzureKeyCredential("{key}"))
//             .endpoint("https://{}.cognitiveservices.azure.com/")
//             .buildClient();
//     }
// }

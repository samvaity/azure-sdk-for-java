# Azure Cognitive Service - Personalizer for Java

> see https://aka.ms/autorest

### Setup
```ps
Fork and clone https://github.com/Azure/autorest.java 
git checkout main
git submodule update --init --recursive
mvn package -Dlocal
npm install
npm install -g autorest
```

### Generation
```ps
cd <swagger-folder>
autorest --java --use:@autorest/java@4.0.x
```

### Code generation settings
``` yaml
input-file: https://raw.githubusercontent.com/Azure/azure-rest-api-specs/main/specification/cognitiveservices/data-plane/Personalizer/preview/v1.1-preview.3/Personalizer.json
java: true
output-folder: ../
namespace: com.azure.ai.personalizer
generate-client-interfaces: false
license-header: MICROSOFT_MIT_SMALL
data-plane: true
credential-types: tokencredential, azurekeycredential
credential-scopes: https://cognitiveservices.azure.com/.default
title: PersonalizerClient
use: '@autorest/java@4.1.0'
service-interface-as-public: true
sync-methods: all
add-context-parameter: true
generate-sync-async-clients: true
context-client-method-parameter: true
generate-samples: true
generate-tests: true
```

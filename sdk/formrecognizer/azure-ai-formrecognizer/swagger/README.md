# Azure Cognitive Service - Form Recognizer for Java

> see https://aka.ms/autorest

### Setup
```ps
Fork and clone https://github.com/Azure/autorest.java 
git checkout v4
git submodule update --init --recursive
mvn package -Dlocal
npm install
npm install -g autorest
```

### Generation
```ps
cd <swagger-folder>
autorest --java --use=C:/work/autorest.java
```

### Code generation settings
``` yaml
input-file: ./fr-3.json
java: true
output-folder: ..\
generate-client-as-impl: true
namespace: com.azure.ai.formrecognizer.v3
generate-client-interfaces: false
sync-methods: all
license-header: MICROSOFT_MIT_SMALL
add-context-parameter: true
models-subpackage: implementation.models
context-client-method-parameter: true
custom-types-subpackage: models
service-interface-as-public: true
```

### Add multiple service API support
This is better to fixed in the swagger, but we are working around now.
```yaml
directive:
- from: swagger-document
  where: $["x-ms-parameterized-host"]
  transform: >
    $.hostTemplate = "{endpoint}/formrecognizer/{ApiVersion}";
    $.parameters.push({
      "name": "ApiVersion",
      "description": "Form Recognizer API version.",
      "x-ms-parameter-location": "client",
      "required": true,
      "type": "string",
      "in": "path",
      "x-ms-skip-url-encoding": true
    });
```

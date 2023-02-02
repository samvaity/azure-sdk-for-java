# Guide for migrating to the test proxy

This guide describes the changes that service SDKs should make to their test frameworks in order to take advantage of
the Azure SDK test proxy.

Documentation of the motivations and goals of the test proxy can be found [here][general_docs] in the azure-sdk-tools
GitHub repository, and documentation of how to set up and use the proxy can be found [here][detailed_docs].

## Table of contents
- [Re-record existing test recordings](#re-record-existing-test-recordings)
- [Run tests](#run-tests)
    - [Perform one-time setup](#perform-one-time-setup)
    - [Start the proxy server](#start-the-proxy-server)
    - [Record or play back tests](#record-or-play-back-tests)
    - [Register sanitizers](#register-sanitizers)
    - [Enable the test proxy in pipelines](#enable-the-test-proxy-in-pipelines)
    - [Record test variables](#record-test-variables)
- [Migrate management-plane tests](#migrate-management-plane-tests)
- [Next steps](#next-steps)
- [Advanced details](#advanced-details)
    - [What does the test proxy do?](#what-does-the-test-proxy-do)
    - [How does the test proxy know when and what to record or play back?](#how-does-the-test-proxy-know-when-and-what-to-record-or-play-back)
    - [Start the proxy manually](#start-the-proxy-manually)

## Re-record existing test recordings
Each SDK needs to re-record its test recordings using the test-proxy integration to ensure a consolidated recording format with serialized/sanitized requests and their matching responses.
#### Steps:
1) Run & update test recordings using the [test-proxy integration](https://github.com/Azure/azure-sdk-for-java/pull/32668).
2) Add [custom sanitizers](https://github.com/samvaity/azure-sdk-for-java/blob/ed6c25bd9521631080fbd0c2eeeac5180fac4fe4/sdk/formrecognizer/azure-ai-formrecognizer/src/test/java/com/azure/ai/formrecognizer/documentanalysis/administration/DocumentModelAdministrationClientTestBase.java#L52-L56) if needed to address service-specific redactions. [Default redactors](https://github.com/Azure/azure-sdk-for-java/blob/caf484edbb1b679243ffa960f7960ddf643362d6/sdk/core/azure-core-test/src/main/java/com/azure/core/test/utils/TestProxyUtils.java#L89-L96) are already set up here in Test Proxy for primary sanitization.
3) Check in the updated recordings to the main repo, [example recording](https://github.com/samvaity/azure-sdk-for-java/blob/ed6c25bd9521631080fbd0c2eeeac5180fac4fe4/sdk/formrecognizer/azure-ai-formrecognizer/src/test/resources/session-records/EXAMPLE_DocumentModelAdminClientTest.getModelWithResponse%5B1%5D.json)

## Run tests
Test-Proxy maintains a _separate clone_ for each assets.json. The recording files will be located under your repo root under the `.assets` folder.
```text
+-------------------------------+
|  azure-sdk-for-java/        |
|    sdk/                       |
|      storage/                 |
| +------assets.json            |
| |    appconfiguration/        |
| | +----assets.json            |
| | |  keyvault/                |
| | |    azure-keyvault-secrets |
| | |      assets.json-------+  |
| | |    azure-keyvault-keys |  |
| | |      assets.json---+   |  |
| | |                    |   |  |
| | |.assets/            |   |  |
| | +--AuN9me8zrT/       |   |  |
| |      <sparse clone>  |   |  |
| +----5hgHKwvMaN/       |   |  |
|        <sparse clone>  |   |  |
|      AuN9me8zrT--------+   |  |
|        <sparse clone>      |  |
|      BSdGcyN2XL------------+  |
|        <sparse clone>         |
+-------------------------------+
```

### Perform one-time setup

1. Docker (or Podman) is a requirement for using the test proxy. You can install Docker from [docs.docker.com][docker_install], or install Podman at [podman.io][podman]. To use Podman, set an alias for `podman` to replace the `docker` command.
2. After installing, make sure Docker/Podman is running and is using Linux containers before running tests.
3. Follow the instructions [here][proxy_cert_docs] to complete setup. You need to trust a certificate on your machine in
   order to communicate with the test proxy over a secure connection.

### Start the proxy server

The test proxy has to be available in order for tests to work in live or playback mode. There's a
[section](#manually-start-the-proxy) under [Advanced details](#advanced-details) that describes how to do this manually,
but it's recommended that tests use a `pytest` fixture to start and stop the proxy automatically when running tests.

The `com.azure.core.test.TestBase` method `setupClass()` is responsible for starting test proxy by setting the environment variable `AZURE_TEST_PROXY` to `TRUE`.

```python
@BeforeAll
public static void setupClass() {
    testMode = initializeTestMode();
    if (useTestProxy() && (testMode == TestMode.PLAYBACK || testMode == TestMode.RECORD)) {
        testProxyManager.startProxy();
    }
}
```

The `testProxyManager.startProxy()` method will fetch the test proxy Docker image and start the test proxy.

### Record or play back tests

#### Running tests in `Playback` mode
When running tests in Playback mode, the `test-proxy` automatically checks out the appropriate tag in each local assets repo and peforms testing.

#### Running tests in `Record` mode
After running tests in record mode, the newly updated recordings will be available within the associated assets repository.
You can then, view the changes before [pushing the updated recordings](https://github.com/Azure/azure-sdk-tools/tree/main/tools/test-proxy/documentation/asset-sync#pushing-new-recordings) to the assets repo.
You can either use `CLI` or `Docker` commands to push the recordings.
CLI

`test-proxy push <path-to-assets-json>`

Docker

`docker run --rm -v "C:/repo/sdk-for-java:/srv/testproxy"  -e "GIT_TOKEN=myveryrealtoken" -e "GIT_COMMIT_OWNER=scbedd" -e  "GIT_COMMIT_EMAIL=scbedd@microsoft.com" azsdkengsys.azurecr.io/engsys/test-proxy:latest test-proxy push -a sdk/tables/assets.json`

### Register sanitizers

Since the test proxy doesn't use [`RecordNetworkCallPolicy`][RecordNetworkCallPolicy], tests don't use the `RecordingRedactor` to sanitize values in recordings.
Instead, sanitizers (as well as matchers and transforms) can be registered on the proxy as detailed in
[this][sanitizers] section of the proxy documentation. Custom sanitizers can be registered using [`TestProxySanitizer`][test_proxy_sanitizer] respective SDK test classes.
[`Default sanitizers`][default_sanitizers], similar to use of the `RecordingRedactor` are registered in the `TestProxyUtils`. 

Sanitizers, matchers, and transforms remain registered until the proxy container is stopped.
For example, registering a custom sanitizer for redacting the value of json key `modelId` from response body looks like following: 
```java
private static List<TestProxySanitizer> customSanitizer = new ArrayList<>();

public static final String REDACTED = "REDACTED";

static {
    // testing different sanitizer options
    customSanitizer.add(new TestProxySanitizer("$..modelId", REDACTED, TestProxySanitizerType.BODY));
}

@Override
protected void beforeTest() {
    // add sanitizer to Test Proxy Policy
    interceptorManager.addRecordSanitizers(customSanitizer);
}
```

Note that the sanitizer fixture accepts the `test_proxy` fixture as a parameter to ensure the proxy is started
beforehand.

For a more advanced scenario, where we want to sanitize the account names of all Tables endpoints in recordings, we
could instead use the `BODY_REGEX` sanitizer type:

```java
customSanitizer.add(new TestProxySanitizer("(?<=\\/\\/)[a-z]+(?=(?:|-secondary)\\.table\\.core\\.windows\\.net)", "REDACTED", TestProxySanitizerType.URI));
```
In the
snippet above, any storage endpoint URIs that match the specified URL regex will have their account name replaced with
"REDACTED". A request made to `https://tableaccount-secondary.table.core.windows.net` will be recorded as being
made to `https://REDACTED-secondary.table.core.windows.net`, and URLs will also be sanitized in bodies and headers.

For more details about sanitizers and their options, please refer to [TestProxySanitizer][test_proxy_sanitizer].

#### Note regarding body matching

In the old testing system, request and response bodies weren't compared in playback mode by default in
most packages. The test proxy system enables body matching by default, which can introduce failures for tests that
passed in the old system. For example, if a test sends a request that includes the current Unix time in its body, the
body will contain a new value when run in playback mode at a later time. This request might still match the recording if
body matching is disabled, but not if it's enabled.

Body matching can be turned off with the test proxy by calling the `setBodilessMatcher` method from
[TestProxySanitizer][test_proxy_sanitizer] at the very start of a test method. This matcher applies only to the
test method that `setBodilessMatcher` is called from, so other tests in the session will still have body
matching enabled by default.

### Enable the test proxy in pipelines

#### CI pipelines

To enable using the test proxy in CI, you need to set the parameter `TestProxy: true` in the `ci.yml` file in the
service-level folder. For example, in [sdk/formrecognizer/ci.yml][pipelines_ci]:

```diff
extends:
  template: ../../eng/pipelines/templates/stages/archetype-sdk-client.yml
  parameters:
    ServiceDirectory: formrecognizer
+   TestProxy: true
    ...
```

#### Live test pipelines

-- TODO --

### Record test variables

To run recorded tests successfully when there's an element of non-secret randomness to them, the test proxy provides a
[`variables` API][variables_api]. This makes it possible for a test to record the values of variables that were used
during recording and use the same values in playback mode without a sanitizer.

For example, imagine that a test uses a randomized `tableName` variable when creating resources. The same random value
for `tableName` can be used in playback mode by using this `variables` API.

## Migrate management-plane tests

For management-plane packages, test classes should inherit from [TestBase][test_base].

The rest of the information in this guide applies to management-plane packages as well, except for possible specifics
regarding test resource deployment.

## Next steps

Once your tests have been migrated to the test proxy, they can also have their recordings moved out of the
`azure-sdk-for-java` repo. Refer to the [recording migration guide][recording_migration] for more details.

After recordings are moved, you can refer to the instructions in [`TestProxyMigration.md`][test_proxy_migration] to manage them.

## Advanced details

### What does the test proxy do?

The basic idea is to have a test server that sits between the client being tested and the live endpoint. 
Instead of mocking out the communication with the server, the communication can be redirected to a test server.

For example, if an operation would typically make a GET request to
`https://fakeazsdktestaccount.table.core.windows.net/Tables`, that operation should now be sent to
`https://localhost:5001/Tables` instead. The original endpoint should be stored in an `x-recording-upstream-base-uri` --
the proxy will send the original request and record the result.

The [`TestProxyManager`][test_proxy_manager] does this for you.

### How does the test proxy know when and what to record or play back?

This is achieved by making POST requests to the proxy server that say whether to start or stop recording or playing
back, as well as what test is being run.

To start recording a test, the server should be primed with a POST request:

```
URL: https://localhost:5001/record/start
headers {
    "x-recording-file": "<path-to-test>/recordings/<testfile>.<testname>"
}
```

This will return a recording ID in an `x-recording-id` header. This ID should be sent as an `x-recording-id` header in
all further requests during the test.

After the test has finished, a POST request should be sent to indicate that recording is complete:

```
URL: https://localhost:5001/record/stop
headers {
    "x-recording-id": "<x-recording-id>"
}
```

Running tests in playback follows the same pattern, except that requests will be sent to `/playback/start` and
`/playback/stop` instead. A header, `x-recording-mode`, should be set to `record` for all requests when recording and
`playback` when playing recordings back. More details can be found [here][detailed_docs].

The [`TestProxyRecordPolicy`][test_proxy_record_policy] and [`TestProxyPlaybackClient`][test_proxy_playback_client] send the appropriate requests at the start and end of
each test case.

### Start the proxy manually
**<TODO>**
There are two options for manually starting and stopping the test proxy: one uses a PowerShell command, and one uses
methods from `devtools_testutils`.

#### PowerShell

There is a [PowerShell script][docker_start_proxy] in `eng/common/testproxy` that will fetch the proxy Docker image if
you don't already have it, and will start or stop a container running the image for you. You can run the following
command from the root of the `azure-sdk-for-java` directory to start the container whenever you want to make the test
proxy available for running tests:

```powershell
.\eng\common\testproxy\docker-start-proxy.ps1 "start"
```

Note that the proxy is available as long as the container is running. In other words, you don't need to start and
stop the container for each test run or between tests for different SDKs. You can run the above command in the morning
and just stop the container whenever you'd like. To stop the container, run the same command but with `"stop"` in place
of `"start"`.

#### Python

There are two methods in `devtools_testutils`, [start_test_proxy][start_test_proxy] and
[stop_test_proxy][stop_test_proxy], that can be used to manually start and stop the test proxy. Like
`docker-start-proxy.ps1`, `start_test_proxy` will automatically fetch the proxy Docker image for you and start the
container if it's not already running.

For more details on proxy startup, please refer to the [proxy documentation][detailed_docs].


[custom_sanitizer_example]: https://github.com/samvaity/azure-sdk-for-java/blob/ed6c25bd9521631080fbd0c2eeeac5180fac4fe4/sdk/formrecognizer/azure-ai-formrecognizer/src/test/java/com/azure/ai/formrecognizer/documentanalysis/administration/DocumentModelAdministrationClientTestBase.java#L52-L56

[default_sanitizers]: https://github.com/Azure/azure-sdk-for-java/blob/caf484edbb1b679243ffa960f7960ddf643362d6/sdk/core/azure-core-test/src/main/java/com/azure/core/test/utils/TestProxyUtils.java#L89-L96
[detailed_docs]: https://github.com/Azure/azure-sdk-tools/tree/main/tools/test-proxy/Azure.Sdk.Tools.TestProxy/README.md
[docker_install]: https://docs.docker.com/get-docker/

[docker_start_proxy]: https://github.com/Azure/azure-sdk-for-java/blob/main/eng/common/testproxy/docker-start-proxy.ps1

[general_docs]: https://github.com/Azure/azure-sdk-tools/blob/main/tools/test-proxy/README.md

[pipelines_ci]: https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/sdk/formrecognizer/ci.yml
[podman]: https://podman.io/
[proxy_cert_docs]: https://github.com/Azure/azure-sdk-tools/blob/main/tools/test-proxy/documentation/test-proxy/trusting-cert-per-language.md

[recording_migration]: https://github.com/Azure/azure-sdk-for-java/blob/main/doc/dev/recording_migration_guide.md
[RecordNetworkCallPolicy]: https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/core/azure-core-test/src/main/java/com/azure/core/test/policy/RecordNetworkCallPolicy.java

[sanitizers]: https://github.com/Azure/azure-sdk-tools/blob/main/tools/test-proxy/Azure.Sdk.Tools.TestProxy/README.md#session-and-test-level-transforms-sanitiziers-and-matchers
[start_test_proxy]: TODO
[stop_test_proxy]: TODO

[test_proxy_migration]: https://github.com/Azure/azure-sdk-for-java/wiki/Test-Proxy-Migration
[test_proxy_sanitizer]: https://github.com/Azure/azure-sdk-for-java/blob/caf484edbb1b679243ffa960f7960ddf643362d6/sdk/core/azure-core-test/src/main/java/com/azure/core/test/models/TestProxySanitizer.java
[test_base]: https://github.com/Azure/azure-sdk-for-java/blob/main/sdk/core/azure-core-test/src/main/java/com/azure/core/test/TestBase.java
[test_proxy_manager]: https://github.com/Azure/azure-sdk-for-java/blob/caf484edbb1b679243ffa960f7960ddf643362d6/sdk/core/azure-core-test/src/main/java/com/azure/core/test/utils/TestProxyManager.java
[test_proxy_record_policy]: https://github.com/Azure/azure-sdk-for-java/blob/caf484edbb1b679243ffa960f7960ddf643362d6/sdk/core/azure-core-test/src/main/java/com/azure/core/test/policy/TestProxyRecordPolicy.java
[test_proxy_playback_client]: https://github.com/Azure/azure-sdk-for-java/blob/caf484edbb1b679243ffa960f7960ddf643362d6/sdk/core/azure-core-test/src/main/java/com/azure/core/test/http/TestProxyPlaybackClient.java

[variables_api]: https://github.com/Azure/azure-sdk-tools/tree/main/tools/test-proxy/Azure.Sdk.Tools.TestProxy#storing-variables

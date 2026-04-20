---
name: azure-cosmos
description: 'Hand-written Cosmos DB SQL API client. WHEN: modify azure-cosmos; fix azure-cosmos bug; add azure-cosmos feature; azure-cosmos API change; azure-cosmos new model.'
---

# azure-cosmos

Hand-written (non-generated) Azure Cosmos DB SQL API client library. ~1,267 source files. Sync and async clients with reactive internals.

## Common Pitfalls

- **Always update both sync and async clients.** `CosmosClient` is a thin sync wrapper over `CosmosAsyncClient`. When adding/changing container or database operations, update `CosmosAsyncContainer`/`CosmosAsyncClient` first, then mirror in `CosmosContainer`/`CosmosClient`.
- **Register new public types in `ImplementationBridgeHelpers`.** Any new public class whose internals need cross-package access MUST define a nested `Helper`/`Accessor` interface in `ImplementationBridgeHelpers.java` and register it via a static initializer block. Missing this causes `NullPointerException` at runtime.
- **Use the `@Beta` annotation from `com.azure.cosmos.util.Beta`**, NOT from `azure-core`. Cosmos has its own `@Beta` with `SinceVersion` tracking. Check `Beta.SinceVersion` enum for the correct version constant.
- **Tests live in a separate module.** Unit and integration tests are in `azure-cosmos-tests`, not in `azure-cosmos/src/test/`. Build with `mvn test` from `sdk/cosmos/azure-cosmos-tests`.
- **Never use external Guava or Apache Commons directly.** The package vendors shaded copies under `implementation/guava25/` and `implementation/apachecommons/`. Import from `com.azure.cosmos.implementation.guava25` and `com.azure.cosmos.implementation.apachecommons`.

## Architecture

See [references/architecture.md](references/architecture.md) for full layout.

| Layer | Key Classes | Notes |
|---|---|---|
| Public async API | `CosmosAsyncClient`, `CosmosAsyncDatabase`, `CosmosAsyncContainer`, `CosmosAsyncScripts` | Reactive (`Mono`/`Flux`/`CosmosPagedFlux`). Entry point: `CosmosClientBuilder` |
| Public sync API | `CosmosClient`, `CosmosDatabase`, `CosmosContainer`, `CosmosScripts` | Wraps async client. Returns `CosmosPagedIterable` |
| Models | `models/Cosmos*Properties`, `models/Cosmos*RequestOptions`, `models/Cosmos*Response` | Request/response POJOs. `ModelBridgeInternal` for internal access |
| Implementation | `implementation/RxDocumentClientImpl` | Core HTTP/RNTBD dispatcher. Direct and Gateway modes |
| Direct transport | `implementation/directconnectivity/` | RNTBD binary protocol. TCP connections to replicas |
| Routing | `implementation/routing/` | Partition key range resolution, collection routing maps |
| Change feed | `ChangeFeedProcessor` (interface), `ChangeFeedProcessorBuilder`, `implementation/changefeed/` | Distributed change feed processing with lease container |
| Throughput control | `implementation/throughputControl/` | Client-side and server-side rate limiting |
| Circuit breaker | `implementation/perPartitionCircuitBreaker/` | Per-partition availability tracking |

### Cross-Package Access Pattern

Two bridge mechanisms provide internal access without exposing public API:

1. **`BridgeInternal`** (in `com.azure.cosmos`) — static methods accessing implementation types from the public package.
2. **`ImplementationBridgeHelpers`** (in `com.azure.cosmos.implementation`) — accessor interfaces registered by public classes. Pattern: each public class has a `static { ImplementationBridgeHelpers.XxxHelper.setXxxAccessor(...) }` block.

### Connection Modes

| Mode | Config class | Transport | Default timeouts |
|---|---|---|---|
| Direct | `DirectConnectionConfig` | RNTBD (TCP) | Connect: 5s, Request: 5s |
| Gateway | `GatewayConnectionConfig` | HTTPS | Request: 60s |

## Testing Notes

- Tests module: `sdk/cosmos/azure-cosmos-tests`
- Key base classes: `BatchTestBase`, `FaultInjectionTestBase`
- Fault injection tests: `azure-cosmos-tests/src/test/java/com/azure/cosmos/faultinjection/`
- CRIS (cross-region integration scenarios): `azure-cosmos-tests/src/test/java/com/azure/cosmos/cris/`
- Samples: `sdk/cosmos/azure-cosmos/src/samples/java/com/azure/cosmos/`
- Build command: `mvn install -pl sdk/cosmos/azure-cosmos -am` then `mvn test -pl sdk/cosmos/azure-cosmos-tests`

## References

| Reference | Path |
|---|---|
| Architecture details | [references/architecture.md](references/architecture.md) |

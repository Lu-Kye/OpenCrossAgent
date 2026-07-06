# Code Quality Rules

Coding rules for cross-agent orchestration systems. Each rule uses contrastive examples (Incorrect vs Correct).

## 1. Avoid Code Duplication (DRY)

Every piece of knowledge must have a single, unambiguous, authoritative representation. Extract on the third occurrence (Fowler's Rule of Three).

Four types of duplication to eliminate:
- **Function**: identical bodies copy-pasted → extract generic function
- **Logic**: same business rule with different variable names → single domain function owns the rule
- **Concept**: same concept scattered as ad-hoc conditions → name the concept in a single predicate
- **Pattern**: same fetch-validate-transform repeated → extract recurring pattern into abstraction

```typescript
// Incorrect — same rule in three services, thresholds drift silently
function calculateOrderDiscount(order) {
  if (order.total > 500) return order.total * 0.1;
  if (order.total > 200) return order.total * 0.05;
  return 0;
}

// Correct — single source of truth
function getDiscountRate(amount: number): number {
  if (amount > 500) return 0.1;
  if (amount > 200) return 0.05;
  return 0;
}
```

## 2. Typed Error Handling

Never silently swallow exceptions. Every catch block must use typed handling and log with context before rethrowing.

```typescript
// Incorrect — silently swallowed, no trace
catch (e) { return null; }

// Correct — typed, logged with context, rethrown as domain error
catch (error) {
  if (error instanceof PaymentDeclinedError) {
    logger.warn("Payment declined", { orderId, reason: error.reason });
    throw new DomainError(`Payment declined for order ${orderId}`);
  }
  logger.error("Unexpected failure", { orderId, error });
  throw error;
}
```

## 3. Command-Query Separation (CQS)

A function must either return a value (query) OR cause a side effect (command), never both.

- Queries return values with **no state changes**
- Commands cause side effects with **no return values**
- Never hide state changes inside what looks like a query
- Never hide control flow (throws) inside what looks like a query
- When both result and side effect needed, split into two explicit steps

```typescript
// Incorrect — looks like query, secretly throws
validateResult(result) // -> throws Error

// Correct — mechanism returns boolean, policy is explicit at call site
if (!isValid(result))
  throw new ProcessingError(result)
```

## 4. Explicit Control Flow (Policy-Mechanism Separation)

Control flow decisions must be visible at the call site, never hidden inside helpers.

- **Mechanism** = pure function that returns a value (`isValid()` returns boolean)
- **Policy** = caller decides what to do (`throw`, `log`, `branch`, `ignore`)
- Never hide throws or branches inside validators that look passive

```typescript
// Incorrect — feature flag hidden inside mechanism
function applyNewFeature(data) {
  if (!featureFlags.isEnabled("new-feature")) return data;
  return transform(data);
}

// Correct — mechanism is pure, policy is at call site
function applyNewFeature(data) { return transform(data); }
const output = featureEnabled ? applyNewFeature(baseData) : baseData;
```

## 5. Explicit Data Flow

If a function produces a result, return it. Never rely on mutation of input parameters to communicate output. Prefer `const` and pure expressions over `let` and mutation.

```typescript
// Incorrect — mutation hides data flow
const result = {};
if (featureEnabled) applyNewFeature(result); // mutates result

// Correct — pure expression, data flow visible
const result = featureEnabled ? applyNewFeature(baseData) : {};
```

## 6. Explicit Side Effects

A reader must understand what a line of code does **without opening the called function**. Each side effect should appear as a distinct line at the call site.

```typescript
// Incorrect — opaque, reader must open processOrder to learn what happens
await processOrder(order);

// Correct — transparent orchestration, every effect visible
await orderRepository.save(order);
await paymentGateway.charge(order.customerId, order.total);
await emailService.sendConfirmation(order.customerId, order.id);
await eventBus.publish("OrderCompleted", { orderId: order.id });
```

## 7. Call-Site Honesty for Logging

Logging calls must be visible at the call site, not buried inside utility functions. Use pure functions only for formatting; keep the logging call explicit.

```typescript
// Incorrect — what's logged? where? what format? hidden behind abstraction
logResult(result);

// Correct — visible: what's logged, the format, the logger
logger.log('Result of execution', formatResult(result));
```

## 8. Principle of Least Astonishment

A function must do exactly what its name and signature suggest — nothing more, nothing less.

- If name implies pure query, do NOT mutate state
- If name implies validation, return result rather than throwing
- No hidden analytics events, no hidden database mutations inside getters

```typescript
// Incorrect — getUser secretly tracks analytics and mutates DB
async function getUser(userId) {
  const user = await userRepository.findById(userId);
  await analyticsService.track("user_viewed", { userId });
  await userRepository.updateLastAccessed(userId, new Date());
  return user;
}

// Correct — getter does only what name says; side effects are explicit at call site
const user = await getUser(userId);
await analyticsService.track("user_viewed", { userId: user.id });
await userRepository.updateLastAccessed(userId, new Date());
```

## 9. Early Return Pattern

Use early returns (guard clauses) at function top to handle error conditions. Keep nesting to 3 or fewer levels. Main logic stays at top indentation level.

```typescript
// Incorrect — happy path buried 5 levels deep
async function validateUser(userId, role) {
  if (userId) {
    const user = await db.users.findById(userId);
    if (user) {
      if (!user.isDeleted) {
        if (user.role === role) { /* ... */ }
      }
    }
  }
}

// Correct — guard clauses, linear reading
async function validateUser(userId, role) {
  if (!userId) throw new Error('User ID is required');
  const user = await db.users.findById(userId);
  if (!user) throw new Error('User not found');
  if (user.isDeleted) throw new Error('User is deleted');
  if (user.role !== role) throw new Error('Insufficient role');
  return user;
}
```

## 10. Function and File Size Limits

- Functions: decompose if longer than **80 lines** into focused functions of **50 lines or fewer**
- Files: keep under **200 lines** — split into separate modules by responsibility when exceeded
- Extract cohesive blocks into named functions with single purpose

## 11. Boy Scout Rule

Leave code better than you found it, but limit improvements to code you're already touching.

**Appropriate**: rename unclear variables, add missing types, extract small helpers, remove dead code.
**Not appropriate**: restructuring modules, introducing new design patterns, refactoring unrelated files.

Stop when improvement is unrelated to current change. Over-engineering disguised as "cleaning up" violates YAGNI.

## 12. Library-First Approach

Always search for existing libraries/services/APIs before writing custom code. Every line of custom code is a liability.

Custom code is only justified when:
- Specific business logic unique to the domain
- Performance-critical paths with special requirements
- Security-sensitive code requiring full control
- Existing solutions don't meet requirements after thorough evaluation

## 13. Parallelize Independent Async Operations

Independent async operations must run concurrently, not sequentially.

```typescript
// Incorrect — sequential, total = latency(A) + latency(B)
const dataA = await serviceA.getData(key);
const dataB = await serviceB.getData(key);

// Correct — concurrent, total = max(latency(A), latency(B))
const [dataA, dataB] = await Promise.all([
  serviceA.getData(key),
  serviceB.getData(key),
]);
```

**Exceptions**: data dependency, ordering requirements, rate limits, resource contention, special failure handling.

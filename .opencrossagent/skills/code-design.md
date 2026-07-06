# Code Design Principles

Architectural rules for cross-agent orchestration systems. Keep domain logic pure, infrastructure separated, and boundaries explicit.

## 1. Separate Domain Logic from Infrastructure

Keep business logic in pure domain/use-case layers, free of framework or infrastructure dependencies.

- Domain entities model business rules with **no imports** from framework or database packages
- Use cases depend on **abstract repository interfaces**, not concrete database clients
- Infrastructure layer implements interfaces and injects them at composition time
- Dependency inversion: **domain drives architecture**, not the framework

### Incorrect — Business logic in HTTP handler

```typescript
app.post("/orders", async (req, res) => {
  const { customerId, items } = req.body;
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = total > 100 ? total * 0.1 : 0;
  const order = await prisma.order.create({
    data: { customerId, total: total - discount, items: { create: items } },
  });
  res.json(order);
});
```

### Correct — Domain logic is framework-free

```typescript
// domain/order.ts — pure business logic, no framework imports
export function calculateOrderTotal(items: OrderItem[]): number {
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const discount = subtotal > 100 ? subtotal * 0.1 : 0;
  return subtotal - discount;
}

// application/create-order.ts — use case depends on abstraction
export class CreateOrder {
  constructor(private readonly orders: OrderRepository) {}
  async execute(customerId: string, items: OrderItem[]): Promise<Order> {
    const total = calculateOrderTotal(items);
    return this.orders.save({ customerId, total, items });
  }
}

// infrastructure/controller.ts — thin adapter
app.post("/orders", async (req, res) => {
  const order = await createOrder.execute(req.body.customerId, req.body.items);
  res.json(order);
});
```

## 2. Enforce Separation of Concerns Between Layers

Each architectural layer has a single responsibility:

| Layer | Responsibility | Must NOT Do |
|-------|---------------|-------------|
| Controllers | HTTP handling only | Business logic, DB queries |
| Services | Business logic | HTTP handling, direct DB queries |
| Repositories | Data access | Business logic |

- Do NOT mix business logic with UI components
- Keep database queries out of controllers
- Business rules in services can be reused across entry points (API, CLI, events)

## 3. Functional Core, Imperative Shell

Keep business logic in pure functions. Push all side effects to an outer imperative shell.

- **Pure core**: inputs → outputs, no side effects, deterministic, trivially testable without mocks
- **Imperative shell**: orchestrates I/O around the pure core (DB calls, HTTP, logging, file I/O)
- Separate "what to compute" from "how to execute it"

### Incorrect — Calculation tangled with side effects

```typescript
async function applySubscriptionRenewal(customerId, logger, db, mailer) {
  const customer = await db.customers.findById(customerId);
  const plan = await db.plans.findById(customer.planId);
  let price = plan.basePrice;
  if (customer.loyaltyYears >= 3) {
    price = price * 0.85;
    logger.info(`Applied discount for ${customerId}`);
  }
  await db.invoices.create({ customerId, total: price });
  await mailer.send(customer.email, `Total: $${price}`);
}
```

### Correct — Pure core + imperative shell

```typescript
// Pure core — deterministic, zero mocks needed for testing
function calculateRenewal(input: RenewalInput): RenewalResult {
  let price = input.basePrice;
  if (input.loyaltyYears >= 3) price *= 0.85;
  const tax = price * input.taxRate;
  return { price, tax, total: price + tax };
}

// Imperative shell — orchestrates I/O
async function processRenewal(customerId, db, mailer, logger) {
  const customer = await db.customers.findById(customerId);
  const plan = await db.plans.findById(customer.planId);
  const result = calculateRenewal({
    basePrice: plan.basePrice,
    loyaltyYears: customer.loyaltyYears,
    taxRate: customer.taxRate,
  });
  await db.invoices.create({ customerId, total: result.total });
  await mailer.send(customer.email, `Total: $${result.total}`);
}
```

## 4. Use Domain-Specific Names Instead of Generic Module Names

**AVOID**: `utils`, `helpers`, `common`, `shared` — these attract unrelated functions and become dumping grounds.

**USE**: Domain-specific names reflecting bounded context and single responsibility:
- `OrderCalculator`, `UserAuthenticator`, `InvoiceGenerator`

Generic names signal missing domain analysis. When you reach for `utils.ts`, the function belongs in a domain module that hasn't been identified yet.

## 5. Architecture Pattern Selection

When designing a new module, explicitly choose an architecture pattern:

| Pattern | Choose When |
|---------|------------|
| Layered | Simple CRUD, clear presentation/business/data separation |
| Hexagonal (Ports & Adapters) | Multiple external integrations, swappable adapters |
| Clean | Complex business logic, multiple delivery mechanisms |
| Event-Driven | Async workflows, decoupled components, real-time requirements |
| Microkernel | Plugin-based systems, extensible feature sets |

**NEVER** present multiple options without choosing one. State the pattern, justify it with codebase precedent.

## DDD Verification Checklist

- [ ] Bounded contexts identified with explicit names
- [ ] Domain entities have zero infrastructure imports
- [ ] Business logic independent of frameworks and libraries
- [ ] Use cases isolated — one use case per file/class
- [ ] No generic module names (utils, helpers, common, shared)
- [ ] Dependency direction: all dependencies point inward (domain ← use cases ← adapters ← frameworks)

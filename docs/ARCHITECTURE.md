# 🔮 Oracle — Architecture

## 1. Overview

Oracle is a small public serverless web application that accepts a user's question and returns an AI-generated "prophecy".

The application is intentionally anonymous: there are no user accounts, authentication, or OAuth.

The main goal is to build a small but production-like serverless project using:

- GitHub Pages
- Yandex Cloud Functions
- Yandex API Gateway
- Yandex YDB
- Yandex Lockbox
- OpenRouter
- Terraform
- GitHub Actions

The frontend is public and static. All secrets and validation logic remain on the backend.

---

## 2. High-level architecture

```text
                         ┌─────────────────────┐
                         │     GitHub Pages    │
                         │                     │
                         │  HTML / CSS / JS    │
                         │  Oracle UI          │
                         └──────────┬──────────┘
                                    │
                              HTTPS POST
                              /api/ask
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Yandex API Gateway │
                         │                     │
                         │  Public API entry   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │  Cloud Function     │
                         │                     │
                         │  • request validation
                         │  • client validation
                         │  • rate limiting   │
                         │  • prompt building │
                         │  • OpenRouter call │
                         │  • response validation
                         └──────┬────────┬──────┘
                                │        │
                         ┌──────┘        └───────────┐
                         ▼                            ▼
                  ┌─────────────┐              ┌─────────────┐
                  │     YDB     │              │  OpenRouter │
                  │             │              │             │
                  │ rate limits │              │ Free model  │
                  └─────────────┘              └─────────────┘

                         ┌─────────────┐
                         │   Lockbox   │
                         │             │
                         │ API key     │
                         │ HMAC secret │
                         └──────┬──────┘
                                │
                                ▼
                         Cloud Function
```

---

# 3. Components

## 3.1 GitHub Pages

Static frontend.

Responsibilities:

- render Oracle UI;
- collect user's question;
- call backend API;
- display Oracle response;
- display errors;
- optionally generate shareable links in the future.

The frontend must not contain:

- OpenRouter API key;
- HMAC secret;
- Yandex credentials;
- backend administrative credentials.

Possible structure:

```text
frontend/
├── index.html
├── style.css
└── app.js
```

---

## 3.2 API Gateway

API Gateway is the public HTTP entry point.

Initial endpoints:

```text
POST /api/session
POST /api/ask
```

Responsibilities:

- HTTPS endpoint;
- routing;
- CORS configuration;
- request forwarding to Cloud Functions;
- potential infrastructure-level request restrictions.

API Gateway is not responsible for application authentication.

---

## 3.3 Cloud Function

The Cloud Function is the main backend component.

Responsibilities:

1. Parse request.
2. Validate request.
3. Validate anonymous client token.
4. Apply rate limits.
5. Construct the Oracle prompt.
6. Call OpenRouter.
7. Validate the LLM response.
8. Return normalized JSON to frontend.

The Function should never expose raw internal errors or secrets to the client.

---

# 4. Anonymous client identity

The application does not have user accounts.

Instead, the backend assigns each browser an anonymous signed client ID.

## 4.1 Client creation

On the first visit:

```text
Browser
   │
   │ GET /api/session
   ▼
Cloud Function
   │
   ├── generate random client_id
   ├── signature = HMAC(secret, client_id)
   │
   ▼
Set-Cookie:
oracle_client=<client_id>.<signature>
```

The client ID must be generated using a cryptographically secure random generator.

Recommended size:

```text
256 bits
```

---

## 4.2 Cookie

Cookie attributes:

```http
Secure
HttpOnly
SameSite=Lax
```

Example:

```text
oracle_client=<client_id>.<signature>
```

The frontend does not need to read this cookie.

The browser automatically sends it with backend requests.

---

## 4.3 Client validation

For every `/api/ask` request:

```text
1. Read oracle_client cookie
2. Split into client_id and signature
3. Calculate HMAC(secret, client_id)
4. Constant-time compare signatures
5. Reject invalid signature
6. Use client_id as rate-limit key
```

Conceptually:

```text
received:
    client_id.signature

expected:
    HMAC(HMAC_SECRET, client_id)

if received_signature != expected:
    401 Unauthorized
```

The HMAC secret is stored in Yandex Lockbox.

---

# 5. Security model

The signed client ID prevents a client from arbitrarily choosing another valid client ID.

Without signing, a malicious client could simply change:

```text
client_id=user-a
```

to:

```text
client_id=user-b
```

With HMAC, the client cannot generate a valid signature without knowing the backend secret.

However, this is **not authentication**.

A user can delete the cookie and receive a new anonymous identity.

Therefore the system protects against:

- forging another client's ID;
- accidentally sharing rate-limit state;
- simple client-side manipulation.

It does not fully protect against:

- cookie deletion;
- multiple browsers;
- VPNs;
- botnets;
- distributed abuse.

For a public hobby project this is acceptable.

---

# 6. Rate limiting

Initial per-client limit:

```text
20 requests / hour
```

The rate limit is enforced on the backend.

The frontend must never be responsible for enforcing the limit.

## 6.1 YDB data

Initial conceptual table:

```text
rate_limits
────────────────────────
client_id
window_start
request_count
```

The implementation should use an atomic operation/transaction so that concurrent requests cannot bypass the limit due to race conditions.

---

## 6.2 Request flow

```text
POST /api/ask
       │
       ▼
Validate client
       │
       ▼
Read rate-limit state
       │
       ├── >= 20 → 429
       │
       └── < 20
              │
              ▼
          increment
              │
              ▼
        call OpenRouter
```

---

## 6.3 Response when limited

HTTP:

```http
429 Too Many Requests
Retry-After: <seconds>
```

JSON:

```json
{
  "error": "oracle_resting",
  "retry_after": 1842
}
```

Frontend can render this as an Oracle-themed response.

Example:

```text
THE ORACLE IS RESTING

The spirits require silence.

Try again in 30 minutes.
```

---

## 6.4 Global rate limit

A second global limit may be added to protect the OpenRouter quota.

Example:

```text
1000 requests / hour globally
```

This protects against abuse from many different anonymous client IDs.

The global limit is separate from the per-client limit.

---

# 7. Request validation

The public API accepts only the minimum required input.

Request:

```json
{
  "question": "Should I learn Rust?"
}
```

Validation:

```text
Content-Type == application/json

question exists

question is a string

1 <= length(question) <= 500

HTTP body size is limited
```

The frontend must not be allowed to control LLM configuration.

Do not accept:

```json
{
  "question": "...",
  "system_prompt": "...",
  "model": "...",
  "temperature": "...",
  "max_tokens": "..."
}
```

The backend controls these values.

---

# 8. Oracle prompt

The backend constructs the system prompt.

The client supplies only the question.

Conceptually:

```text
SYSTEM:

You are THE ORACLE.

You answer questions as an ancient mystical oracle.

Return a structured response containing:

- verdict
- confidence
- prophecy
- reason

Never mention that you are an AI.

...

USER:

Should I learn Rust?
```

The exact prompt is implementation detail and can evolve independently from the frontend.

---

# 9. OpenRouter integration

The Cloud Function communicates with OpenRouter directly.

```text
Cloud Function
      │
      │ HTTPS
      │ Authorization: Bearer <API_KEY>
      ▼
OpenRouter
      │
      ▼
Selected free model
```

The OpenRouter API key:

- must never be included in frontend JavaScript;
- must never be committed to Git;
- must never be returned in API responses;
- should be stored in Yandex Lockbox.

The initial model can be configured as a backend environment variable.

Example:

```text
ORACLE_MODEL
ORACLE_MAX_TOKENS
```

The exact model is intentionally not part of the architecture.

---

# 10. LLM response validation

The backend should not blindly return the model's response.

Expected logical structure:

```json
{
  "verdict": "YES",
  "confidence": 87,
  "prophecy": "The path is difficult, but the destination is yours.",
  "reason": "Your question suggests..."
}
```

The Function validates:

```text
valid JSON

verdict exists

confidence is numeric

0 <= confidence <= 100

prophecy exists

reason exists

string lengths are limited
```

If validation fails:

```text
502 Bad Gateway
```

Example:

```json
{
  "error": "oracle_unavailable"
}
```

The raw LLM response should not be exposed to the user.

---

# 11. Error model

The backend exposes a small normalized error set.

```text
400 invalid_request
401 invalid_client
429 oracle_resting
502 oracle_unavailable
500 internal_error
```

Example:

```json
{
  "error": "invalid_request"
}
```

Internal errors, stack traces, provider responses, and secrets must not be returned to the client.

---

# 12. YDB

YDB is not required for the core LLM functionality.

Its initial purpose is persistent rate-limit state.

Future uses may include:

```text
questions
────────────────────────
id
client_id
question
verdict
confidence
created_at
```

This can later enable:

- history;
- shareable Oracle results;
- statistics;
- daily questions;
- public question feeds;
- most popular questions.

These features are explicitly outside the initial MVP.

---

# 13. Lockbox

Yandex Lockbox stores secrets.

Initial secrets:

```text
OPENROUTER_API_KEY
HMAC_SECRET
```

Potential future secrets:

```text
other provider credentials
external API keys
signing keys
```

Secrets must not be stored in:

- Git;
- frontend source;
- Terraform variables committed to Git;
- API responses.

---

# 14. Infrastructure as Code

All infrastructure should be managed with Terraform.

Expected resources:

```text
infra/
└── terraform/
    ├── main.tf
    ├── functions.tf
    ├── api-gateway.tf
    ├── ydb.tf
    ├── lockbox.tf
    ├── iam.tf
    └── variables.tf
```

Terraform should manage:

- Cloud Function;
- API Gateway;
- YDB;
- Lockbox;
- service accounts;
- IAM permissions;
- relevant configuration.

The Cloud Console should primarily be used for inspection and debugging rather than manual infrastructure changes.

---

# 15. GitOps / CI/CD

Repository:

```text
oracle/
├── frontend/
├── backend/
├── infra/
└── .github/
    └── workflows/
```

GitHub Actions:

```text
                    git push
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
        frontend              backend
             │                   │
             ▼                   ▼
       GitHub Pages        tests / package
                                 │
                                 ▼
                         Cloud Function
                                 
infra changes
       │
       ▼
Terraform plan
       │
       ▼
Terraform apply
```

CI should run at minimum:

```text
backend tests
lint
Terraform validation
Terraform formatting
```

Secrets required by CI should be stored in GitHub Secrets or appropriate cloud secret-management mechanisms.

---

# 16. Repository structure

Initial repository:

```text
oracle/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── backend/
│   ├── handler.py
│   ├── requirements.txt
│   └── tests/
│       └── test_handler.py
│
├── infra/
│   └── terraform/
│       ├── main.tf
│       ├── functions.tf
│       ├── api-gateway.tf
│       ├── ydb.tf
│       ├── lockbox.tf
│       └── iam.tf
│
├── .github/
│   └── workflows/
│       ├── frontend.yml
│       └── backend.yml
│
├── ARCHITECTURE.md
└── README.md
```

---

# 17. MVP scope

The first version should contain only:

### Frontend

- Oracle landing page;
- question input;
- Consult button;
- loading state;
- result display;
- error display.

### Backend

- `/api/session`;
- `/api/ask`;
- anonymous signed client ID;
- request validation;
- 20 requests/hour per client;
- global safety limit;
- prompt construction;
- OpenRouter integration;
- response validation.

### Infrastructure

- GitHub Pages;
- API Gateway;
- Cloud Function;
- YDB;
- Lockbox;
- IAM;
- Terraform;
- GitHub Actions.

---

# 18. Explicitly out of MVP

Do not implement initially:

- user accounts;
- OAuth;
- JWT;
- admin panel;
- WebSockets;
- chat history;
- public profiles;
- complex analytics;
- multiple backend services;
- model selection by user;
- user-controlled prompts;
- payments.

The goal is to keep the first version small and complete.

---

# 19. Future features

Potential extensions:

## Shareable prophecies

```text
https://oracle.example/result/8f31ac
```

A result can be shared with friends.

## Multiple Oracle personalities

```text
Ancient Oracle
Dark Oracle
Corporate Oracle
Chaotic Oracle
Machine Oracle
```

Backend selects a different prompt based on the selected Oracle.

## Oracle history

Store generated prophecies in YDB.

## Public feed

```text
Recent prophecies
────────────────────────
Should I quit my job?
→ NO

Should I learn Rust?
→ YES

Should I deploy on Friday?
→ ABSOLUTELY NOT
```

## Daily prophecy

A scheduled Function generates one prophecy per day.

## Statistics

```text
Questions answered: 12,482
YES: 51%
NO: 49%
Most common topic: career
```

---

# 20. Design principles

### Keep the frontend dumb

Frontend is a presentation layer.

Backend owns:

- validation;
- security;
- rate limiting;
- LLM configuration;
- prompt construction.

### Never trust client input

Everything from the browser is untrusted.

### Never expose secrets

OpenRouter credentials and signing keys exist only server-side.

### Serverless-first

Do not introduce a VPS or always-running server.

### Minimize persistent state

YDB should only contain state that actually needs persistence.

### Keep the architecture boring

The fun part should be the Oracle experience, not unnecessary infrastructure complexity.

---

# 21. Final MVP architecture

```text
                     PUBLIC INTERNET
                            │
                            ▼
                  ┌───────────────────┐
                  │    GitHub Pages   │
                  │                   │
                  │   Oracle UI       │
                  └─────────┬─────────┘
                            │
                            │ HTTPS
                            ▼
                  ┌───────────────────┐
                  │  API Gateway      │
                  │                   │
                  │  POST /api/ask    │
                  └─────────┬─────────┘
                            │
                            ▼
                  ┌───────────────────┐
                  │  Cloud Function   │
                  │                   │
                  │  validate         │
                  │  authenticate*    │
                  │  rate-limit       │
                  │  prompt           │
                  │  OpenRouter       │
                  │  validate output  │
                  └─────┬─────────┬───┘
                        │         │
                 ┌──────┘         └────────┐
                 ▼                         ▼
          ┌──────────────┐          ┌──────────────┐
          │     YDB      │          │  OpenRouter  │
          │              │          │              │
          │ rate limits  │          │ free model   │
          └──────────────┘          └──────────────┘

                 ┌──────────────┐
                 │   Lockbox    │
                 │              │
                 │ API key      │
                 │ HMAC secret  │
                 └──────┬───────┘
                        │
                        ▼
                  Cloud Function
```

`*` Anonymous client verification, not user authentication.

---

# 22. First implementation milestone

The first working vertical slice should be:

```text
GitHub Pages
     ↓
POST /api/ask
     ↓
Cloud Function
     ↓
OpenRouter
     ↓
JSON response
     ↓
Oracle UI
```

Only after this works should the following be added:

```text
signed client cookie
        ↓
YDB rate limiting
        ↓
Lockbox
        ↓
Terraform
        ↓
GitHub Actions
```

This keeps debugging isolated and avoids simultaneously debugging frontend, API Gateway, IAM, YDB, secrets, and LLM integration.
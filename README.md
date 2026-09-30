# SMMMARIA

> Enterprise-grade Social Media Marketing (SMM) Panel with automated
> order fulfillment, wallet management, supplier integrations, Child
> Panels, and a Buy Account marketplace.

## 👨‍💻 Creator

<div align="center">

<img src="https://ik.imagekit.io/s95tumxuk/IMG_3295.png"
     alt="SMMMARIA Creator"
     width="180"
     height="180"
     style="border-radius: 50%; object-fit: cover;">

### Created by **MARKMELLON**

📱 **WhatsApp:** [+256 743668990](https://wa.me/256743668990)

💬 [Chat with the Creator on WhatsApp](https://wa.me/256743668990)

</div>

------------------------------------------------------------------------

## Table of Contents

-   [Project Overview](#project-overview)
-   [System Architecture](#system-architecture)
-   [Technology Stack](#technology-stack)
-   [Repository Architecture](#repository-architecture)
-   [Core Features](#core-features)
-   [Service Engine and Catalog](#service-engine-and-catalog)
-   [Service Database Structure](#service-database-structure)
-   [Service API](#service-api)
-   [Order Processing](#order-processing)
-   [Wallet and Financial Flow](#wallet-and-financial-flow)
-   [Firebase Database Structure](#firebase-database-structure)
-   [Child Panel System](#child-panel-system)
-   [Buy Account Marketplace](#buy-account-marketplace)
-   [Security](#security)
-   [Deployment](#deployment)
-   [Implementation and Testing](#implementation-and-testing)
-   [Acceptance Criteria](#acceptance-criteria)

------------------------------------------------------------------------

## Project Overview

SMMMARIA is an enterprise-grade Social Media Marketing (SMM) Panel built
on a decoupled, microservice-ready architecture.

The platform acts as an automated intermediary between clients seeking
social-media growth services such as:

-   Followers
-   Likes
-   Views
-   Comments
-   Other supplier-provided social-media services

and external API suppliers responsible for fulfillment.

The platform handles:

  -----------------------------------------------------------------------
  Area                                Responsibility
  ----------------------------------- -----------------------------------
  Authentication                      User registration, login, JWT
                                      authentication and role-based
                                      access

  Wallet                              Balance management and financial
                                      transactions

  Payments                            Deposit/payment processing

  Services                            Supplier service catalog and
                                      pricing

  Orders                              Order creation, supplier
                                      fulfillment and status
                                      synchronization

  Refunds                             Automatic refunds for failed,
                                      partial or canceled orders

  Child Panels                        Multi-tenant reseller panels

  Marketplace                         Buy Account inventory and purchases

  Notifications                       User and reseller notifications

  Support                             Tickets and ticket messages

  Administration                      Platform-wide management and
                                      configuration
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# System Architecture

SMMMARIA uses a **decoupled architecture**. The frontend and backend are
hosted and operated independently and communicate through REST APIs.

``` text
                         ┌──────────────────────┐
                         │      User Frontend   │
                         │ Netlify / HTML/CSS/JS│
                         └──────────┬───────────┘
                                    │
                                    │ REST API
                                    ▼
                         ┌──────────────────────┐
                         │     Backend API      │
                         │ Node.js + Express     │
                         │       Railway         │
                         └──────────┬───────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
       ┌────────────────┐  ┌────────────────┐  ┌─────────────────┐
       │ Firebase RTDB  │  │ Supplier APIs  │  │ Background Jobs │
       │    Database    │  │    / APIs      │  │    Node-Cron    │
       └────────────────┘  └────────────────┘  └─────────────────┘
```

### Hosting

  Component        Platform                     Technology
  ---------------- ---------------------------- ----------------------
  User Frontend    Netlify                      Static HTML/CSS/JS
  Admin Frontend   Netlify                      Static HTML/CSS/JS
  Backend API      Railway                      Node.js + Express
  Database         Firebase                     Realtime Database
  Source Control   GitHub                       Git
  CI/CD            GitHub + Netlify + Railway   Automatic deployment

------------------------------------------------------------------------

# Technology Stack

## Frontend

  Technology           Purpose
  -------------------- ---------------------------------
  HTML5                Page structure
  CSS3                 Styling
  Vanilla JavaScript   Application logic
  ES6 Modules          Modular JavaScript architecture
  CSS Variables        Theme configuration
  Flexbox              Layout
  CSS Grid             Responsive layouts
  LocalStorage         JWT token storage
  REST API             Backend communication

The frontend follows a modular structure:

``` text
app.js
   ↓
router.js
   ↓
modules/
```

## Backend

  Technology           Purpose
  -------------------- -------------------------------------
  Node.js v22 LTS      Runtime
  Express.js           HTTP/API framework
  Firebase Admin SDK   Database access
  JWT                  Authentication
  bcryptjs             Password hashing
  Zod                  Request/schema validation
  Helmet               HTTP security headers
  CORS                 Cross-origin access control
  Express Rate Limit   Rate limiting
  Node-Cron            Background automation
  Axios                External supplier API communication

------------------------------------------------------------------------

# Repository Architecture

The backend follows a strict:

``` text
Controller → Service → Route
```

architecture.

  -----------------------------------------------------------------------
  Directory                           Responsibility
  ----------------------------------- -----------------------------------
  `src/config/`                       Environment variables and Firebase
                                      initialization

  `src/middleware/`                   Authentication, authorization,
                                      validation, rate limiting and
                                      errors

  `src/controllers/`                  HTTP request handling

  `src/services/`                     Core business logic

  `src/routes/`                       API endpoint definitions

  `src/jobs/`                         Automated cron/background jobs

  `src/utils/`                        JWT, bcrypt, formatting and
                                      response helpers
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# Core Features

  Feature           Description
  ----------------- ----------------------------------------------
  Authentication    Registration, login and JWT-based sessions
  Role Management   `user`, `admin`, `super_admin`
  Wallet            User balance and financial ledger
  Payments          Deposit and payment processing
  Service Catalog   Supplier service synchronization and pricing
  Order Engine      Automated supplier order placement
  Order Sync        Background supplier status synchronization
  Refund Engine     Automatic partial/canceled refunds
  Child Panels      Multi-tenant reseller system
  Buy Account       Marketplace for pre-built social accounts
  Notifications     System and transaction notifications
  Support Tickets   Customer support workflow
  Admin Panel       Platform administration

------------------------------------------------------------------------

# Authentication and Authorization

The authentication flow is:

``` text
User
  ↓
Login / Register
  ↓
Backend
  ↓
bcrypt password verification
  ↓
Signed JWT
  ↓
Frontend LocalStorage
  ↓
Authorization: Bearer <token>
  ↓
Backend protect middleware
```

### Roles

  Role            Access
  --------------- ----------------------------
  `user`          Standard customer features
  `admin`         Administrative management
  `super_admin`   Full platform management

Sensitive endpoints are protected with authentication and administrator
middleware.

------------------------------------------------------------------------

# Wallet and Financial Flow

Financial integrity is maintained using Firebase Realtime Database
transactions.

Transactions are used to protect balance updates against race
conditions.

## Deposit Flow

``` text
Deposit Request
      ↓
Pending Transaction
      ↓
Payment Processing
      ↓
Payment Verification
      ↓
Approval / Settlement
      ↓
Atomic Wallet Credit
      ↓
Transaction Ledger Entry
```

## Order Wallet Flow

``` text
User places order
      ↓
Backend validates service
      ↓
Backend calculates official charge
      ↓
Firebase transaction checks balance
      ↓
Balance deducted atomically
      ↓
Supplier API called
      ↓
Success → Order created
Failure → Automatic refund
```

The frontend must never be trusted to determine the final amount
charged.

------------------------------------------------------------------------

# Service Engine and Catalog

The Service Engine connects SMMMARIA to external wholesale suppliers.

Its main responsibilities are:

1.  Import supplier services.
2.  Normalize supplier data.
3.  Apply supplier markup.
4.  Store services in Firebase.
5.  Expose active services to users.
6.  Allow administrators to manage selling prices and status.

The system separates:

``` text
costPrice
    ↓
Supplier cost

sellingPrice
    ↓
Customer price
```

This ensures the platform can maintain a profit margin.

------------------------------------------------------------------------

# Service Database Structure

Services are stored under the Firebase:

``` text
/services
```

A service follows this structure:

``` json
{
  "services": {
    "supplierId_externalServiceId": {
      "id": "supplierId_externalServiceId",
      "supplierId": "SUP-1",
      "supplierServiceId": "12345",
      "name": "Instagram Followers [Real]",
      "category": "Instagram",
      "costPrice": 1.50,
      "sellingPrice": 2.50,
      "min": 50,
      "max": 10000,
      "averageTime": "2 Hours",
      "refill": true,
      "cancel": false,
      "status": "active"
    }
  }
}
```

## Service Field Table

  Field                 Type      Description
  --------------------- --------- -----------------------------------
  `id`                  String    Internal unique service ID
  `supplierId`          String    Internal supplier identifier
  `supplierServiceId`   String    External supplier service ID
  `name`                String    Service display name
  `category`            String    Social-media/service category
  `costPrice`           Number    Supplier wholesale cost
  `sellingPrice`        Number    Customer-facing price
  `min`                 Number    Minimum order quantity
  `max`                 Number    Maximum order quantity
  `averageTime`         String    Estimated delivery time
  `refill`              Boolean   Whether refill is supported
  `cancel`              Boolean   Whether cancellation is supported
  `status`              String    Service availability status

### Example Service

  -------------------------------------------------------------------------------------------------
  ID              Category    Service          Cost   Selling       Min       Max Refill   Status
  --------------- ----------- ----------- --------- --------- --------- --------- -------- --------
  `SUP-1_12345`   Instagram   Instagram        1.50      2.50        50    10,000 Yes      Active
                              Followers                                                    
                              \[Real\]                                                     

  -------------------------------------------------------------------------------------------------

------------------------------------------------------------------------

# Service Synchronization

The service synchronization workflow is:

``` text
Admin
  ↓
Select Supplier
  ↓
Sync Services
  ↓
supplier.service.js
  ↓
External Supplier API
  ↓
Retrieve Services
  ↓
Apply Markup
  ↓
Normalize Data
  ↓
Firebase /services
```

If an existing service is found, its pricing/data is updated. New
services are created.

------------------------------------------------------------------------

# Service API

  -------------------------------------------------------------------------------------
  Endpoint                        Method            Access            Purpose
  ------------------------------- ----------------- ----------------- -----------------
  `/api/v1/services`              GET               User/Admin        Fetch active
                                                                      services

  `/api/v1/services/categories`   GET               User/Admin        Fetch service
                                                                      categories

  `/api/v1/services/:id`          PUT               Admin             Update service
                                                                      price/status

  `/api/v1/suppliers`             POST              Admin             Add supplier

  `/api/v1/suppliers/:id/sync`    POST              Admin             Synchronize
                                                                      supplier services
  -------------------------------------------------------------------------------------

### User Service Interface

The user frontend displays services as cards with:

-   Service name
-   Category
-   Selling price
-   Minimum quantity
-   Maximum quantity
-   Average delivery time
-   Refill availability

The New Order page uses dynamic category/service dropdowns.

### Price Calculation

``` text
Total Cost = (Quantity / 1000) × sellingPrice
```

The displayed calculation is informational only.

The backend performs the authoritative calculation during order
placement.

------------------------------------------------------------------------

# Order Processing

The order engine is the core fulfillment system.

## Order Lifecycle

``` text
User selects service
        ↓
Enters link and quantity
        ↓
POST /api/v1/orders
        ↓
JWT authentication
        ↓
Service lookup
        ↓
Quantity validation
        ↓
Service status validation
        ↓
Atomic wallet deduction
        ↓
Supplier API request
        ↓
Supplier response
        ↓
Create order
        ↓
Background status synchronization
        ↓
Completed / Partial / Canceled
```

## Order Statuses

  Status          Meaning
  --------------- --------------------------------------------
  `pending`       Order accepted and waiting for fulfillment
  `processing`    Supplier is actively processing
  `in_progress`   Fulfillment is underway
  `completed`     Fully delivered
  `partial`       Partially delivered
  `canceled`      Canceled by supplier/system
  `failed`        Supplier rejected the request

------------------------------------------------------------------------

# Automatic Refunds

For partial or canceled orders, the system calculates the undelivered
amount.

``` text
Refund Amount = (charge / quantity) × remains
```

The refund is processed through a Firebase transaction.

The system then:

1.  Credits the user's wallet.
2.  Creates a refund ledger entry.
3.  Updates the order.
4.  Stores `start_count` and `remains`.

------------------------------------------------------------------------

# Firebase Database Structure

The primary Firebase Realtime Database nodes include:

  Node                   Purpose
  ---------------------- --------------------------------------------------------
  `/users`               User profiles, balances, roles and account information
  `/orders`              SMM order lifecycle
  `/transactions`        Financial ledger
  `/payments`            Deposit/payment records
  `/services`            Service catalog
  `/suppliers`           Supplier configurations
  `/tickets`             Support tickets
  `/ticketMessages`      Ticket conversations
  `/notifications`       User notifications
  `/announcements`       System announcements
  `/childPanels`         Reseller panel configurations
  `/accountInventory`    Buy Account inventory
  `/accountPurchases`    Completed account purchases
  `/accountCategories`   Account marketplace categories

------------------------------------------------------------------------

# Firebase Indexes

Recommended indexes used by the application include:

``` json
{
  "rules": {
    "users": {
      ".indexOn": ["email", "username", "accountId", "childPanelId"]
    },
    "tickets": {
      ".indexOn": ["userId"]
    },
    "orders": {
      ".indexOn": ["userId", "status", "supplierOrderId"]
    },
    "transactions": {
      ".indexOn": ["userId", "status"]
    },
    "payments": {
      ".indexOn": [
        "userId",
        "status",
        "gatewayReference",
        "merchantReference"
      ]
    },
    "notifications": {
      ".indexOn": ["userId"]
    },
    "announcements": {
      ".indexOn": ["createdAt"]
    },
    "refill": {
      ".indexOn": ["userid", "status"]
    },
    "services": {
      ".indexOn": ["status", "category", "supplierId"]
    },
    "childPanels": {
      ".indexOn": [
        "info/subdomain",
        "info/customDomain",
        "info/ownerId",
        "info/admin/username"
      ]
    },
    "accountInventory": {
      ".indexOn": ["status", "categoryId"]
    },
    "accountPurchases": {
      ".indexOn": ["userId"]
    },
    "accountCategories": {
      ".indexOn": ["active"]
    }
  }
}
```

> The `merchantReference` index is required for payment reconciliation
> queries against `/payments`.

------------------------------------------------------------------------

# Child Panel System

SMMMARIA uses a multi-tenant architecture for reseller/Child Panels.

``` text
                   SMMMARIA Backend
                          │
                          ▼
                   Firebase Database
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   Panel A            Panel B            Panel C
        │                 │                 │
   Customers          Customers          Customers
```

A single backend and database can serve multiple reseller panels.

Each panel can have:

-   Its own domain/subdomain
-   Its own branding
-   Its own customers
-   Custom service prices
-   Customer wallets
-   Announcements
-   Orders

The frontend sends:

``` text
X-Panel-Domain
```

The backend uses this to identify the appropriate panel context.

------------------------------------------------------------------------

# Child Panel Frontend

Important reseller modules include:

  File                 Responsibility
  -------------------- -----------------------------------------
  `app.js`             Application entry point and route guard
  `router.js`          Dynamic module loader
  `utils/api.js`       Reseller API wrapper
  `auth.js`            Reseller authentication
  `dashboard.js`       Dashboard statistics
  `users.js`           Customer management and wallet funding
  `orders.js`          Panel orders
  `services.js`        Custom service prices
  `wallet.js`          Reseller wallet and deposits
  `announcements.js`   Panel announcements
  `settings.js`        Panel branding

------------------------------------------------------------------------

# Child Panel Backend

Important backend components include:

  Component                      Responsibility
  ------------------------------ ----------------------------------------
  `childPanel.controller.js`     Panel creation, management and funding
  `childAuth.controller.js`      Child user authentication
  `childUser.controller.js`      Customer management
  `childOrder.controller.js`     Dual-wallet order engine
  `childService.controller.js`   Service/pricing management
  `childWallet.controller.js`    Wallet and deposit management
  `panelContext.js`              Multi-tenant panel identification
  `childPanel.routes.js`         Child Panel API routes
  `syncOrders.js`                Child Panel order synchronization

------------------------------------------------------------------------

# Child Panel Dual-Wallet System

Child Panel orders use two financial layers:

``` text
Child User Wallet
       ↓
Retail Price
       ↓
Reseller Main Wallet
       ↓
Wholesale Cost
       ↓
Supplier
```

If a Child Panel order is canceled or partially completed, the system
can process proportional refunds for both the Child User and Reseller
Owner.

------------------------------------------------------------------------

# Buy Account Marketplace

SMMMARIA also supports a separate marketplace for pre-built social-media
accounts.

The marketplace is intentionally separate from the normal SMM
service/order engine.

## Normal SMM

``` text
Service
   ↓
Order
   ↓
Supplier
   ↓
Order Status
```

## Buy Account

``` text
Account Inventory
   ↓
Purchase
   ↓
Wallet Transaction
   ↓
Invoice
   ↓
Account Delivery
```

Supported platforms can include:

  Platform
  ---------------------------------------
  Instagram
  TikTok
  Facebook
  Twitter/X
  YouTube
  Snapchat
  Telegram
  Pinterest
  Reddit
  LinkedIn
  Other administrator-defined platforms

------------------------------------------------------------------------

# Buy Account Frontend

Recommended pages/modules:

  -----------------------------------------------------------------------------------
  File                                            Purpose
  ----------------------------------------------- -----------------------------------
  `buy-account.html`                              Account marketplace

  `assets/modules/buy-account.js`                 Marketplace logic

  `assets/css/buy-account.css`                    Marketplace styling

  `assets/components/account-card.js`             Account card

  `assets/components/account-filters.js`          Filtering

  `assets/components/account-purchase-modal.js`   Purchase confirmation

  `my-accounts.html`                              Purchased accounts

  `assets/modules/my-accounts.js`                 Purchase history
  -----------------------------------------------------------------------------------

Existing files that may need integration:

  File                             Purpose
  -------------------------------- -----------------------------------
  `assets/js/router.js`            Register marketplace routes
  `assets/components/sidebar.js`   Add Buy Account navigation
  `assets/utils/api.js`            Add marketplace API methods
  `invoice.html`                   Support account purchase invoices

------------------------------------------------------------------------

# Buy Account Database Structure

The marketplace uses:

``` text
/accountCategories
/accountInventory
/accountPurchases
/accountTransactions
```

## Account Category

  Field                 Purpose
  --------------------- -----------------------
  `categoryId`          Unique category ID
  `name`                Display name
  `slug`                URL/system identifier
  `platform`            Social platform
  `description`         Category description
  `icon`                Category icon
  `active`              Category status
  `lowStockThreshold`   Low-stock threshold
  `createdAt`           Creation timestamp
  `updatedAt`           Last update timestamp

## Account Inventory

Each account must be an individual inventory record.

  Field               Purpose
  ------------------- -----------------------
  `accountId`         Unique inventory ID
  `categoryId`        Category
  `platform`          Social platform
  `username`          Account username
  `email`             Account email
  `emailPassword`     Email credential
  `accountPassword`   Account credential
  `accountType`       Account type
  `accountAge`        Account age
  `followers`         Follower count
  `country`           Country/region
  `niche`             Account niche
  `price`             Sale price
  `currency`          Price currency
  `status`            Inventory status
  `reservedAt`        Reservation timestamp
  `soldAt`            Sale timestamp
  `soldTo`            Buyer user ID
  `purchaseId`        Related purchase
  `createdAt`         Creation timestamp
  `updatedAt`         Last update timestamp

### Inventory Status

  Status        Meaning
  ------------- ------------------------
  `available`   Available for purchase
  `reserved`    Temporarily reserved
  `sold`        Purchased
  `disabled`    Not available

------------------------------------------------------------------------

# Account Stock System

Stock is calculated from actual inventory rather than manually entered
quantities.

``` text
Available > lowStockThreshold
        → IN STOCK

Available > 0 and <= lowStockThreshold
        → LOW STOCK

Available = 0
        → OUT OF STOCK
```

After the final available account is purchased, the category
automatically becomes out of stock.

------------------------------------------------------------------------

# Account Purchase Flow

``` text
User selects account
        ↓
Purchase confirmation
        ↓
Show price and wallet balance
        ↓
User confirms
        ↓
POST /accounts/:id/purchase
        ↓
Backend validates account
        ↓
Backend validates actual price
        ↓
Account reservation/locking
        ↓
Wallet balance validation
        ↓
Atomic wallet deduction
        ↓
Account marked SOLD
        ↓
Purchase record created
        ↓
Invoice created
        ↓
Credentials made available to purchaser
        ↓
Inventory refreshed
```

The frontend must never independently deduct wallet funds.

------------------------------------------------------------------------

# Purchase Security

The backend must prevent:

-   Double-click purchases
-   Duplicate API requests
-   Multiple browser tabs buying the same account
-   Two users purchasing the same account simultaneously
-   Purchasing sold accounts
-   Purchasing disabled accounts
-   Price manipulation
-   Unauthorized credential access

The backend is authoritative for:

-   Account availability
-   Account price
-   Wallet balance
-   Purchase status
-   Inventory status
-   Credentials

------------------------------------------------------------------------

# Buy Account API

## Customer API

  ------------------------------------------------------------------------------------------
  Endpoint                                   Method                  Purpose
  ------------------------------------------ ----------------------- -----------------------
  `/api/v1/accounts/categories`              GET                     Get account categories

  `/api/v1/accounts`                         GET                     Get available accounts

  `/api/v1/accounts/:id`                     GET                     Get safe account
                                                                     details

  `/api/v1/accounts/:id/purchase`            POST                    Purchase an account

  `/api/v1/accounts/purchases`               GET                     Get user's purchases

  `/api/v1/accounts/purchases/:id`           GET                     Get purchased account

  `/api/v1/accounts/purchases/:id/invoice`   GET                     Get purchase invoice
  ------------------------------------------------------------------------------------------

## Admin API

  Endpoint                                  Method   Purpose
  ----------------------------------------- -------- -----------------------
  `/api/v1/admin/accounts`                  GET      View inventory
  `/api/v1/admin/accounts`                  POST     Add account
  `/api/v1/admin/accounts/:id`              GET      View account
  `/api/v1/admin/accounts/:id`              PATCH    Update account
  `/api/v1/admin/accounts/:id`              DELETE   Delete unsold account
  `/api/v1/admin/accounts/:id/disable`      POST     Disable account
  `/api/v1/admin/accounts/:id/mark-sold`    POST     Mark account sold
  `/api/v1/admin/accounts/import`           POST     Bulk import accounts
  `/api/v1/admin/accounts/categories`       GET      List categories
  `/api/v1/admin/accounts/categories`       POST     Create category
  `/api/v1/admin/accounts/categories/:id`   PATCH    Update category

------------------------------------------------------------------------

# Purchase Record

Each purchase is stored under:

``` text
/accountPurchases
```

  Field                   Purpose
  ----------------------- -------------------------
  `purchaseId`            Unique purchase
  `userId`                Buyer
  `accountId`             Purchased inventory
  `categoryId`            Category
  `platform`              Social platform
  `username`              Account username
  `amount`                Purchase amount
  `currency`              Currency
  `walletTransactionId`   Wallet ledger reference
  `invoiceId`             Invoice reference
  `status`                Purchase status
  `purchasedAt`           Purchase timestamp

Purchase-time snapshots should be stored so historical invoices remain
accurate.

------------------------------------------------------------------------

# Account Transaction Record

Account purchases have a separate audit record under:

``` text
/accountTransactions
```

  Field             Purpose
  ----------------- --------------------
  `transactionId`   Transaction ID
  `purchaseId`      Purchase reference
  `userId`          Buyer
  `accountId`       Account reference
  `type`            `account_purchase`
  `amount`          Amount charged
  `currency`        Currency
  `status`          Transaction status
  `createdAt`       Creation timestamp

------------------------------------------------------------------------

# Credential Security

Account credentials are sensitive.

Credentials must **not** be returned from:

``` text
GET /api/v1/accounts
GET /api/v1/accounts/categories
```

They should only be available through protected purchased-account
endpoints after verifying that:

``` text
authenticated user === purchaser
```

Credentials must not be placed in:

-   Public API responses
-   Account cards
-   Category responses
-   Frontend source code
-   LocalStorage
-   Normal application logs

Passwords must never be logged.

------------------------------------------------------------------------

# Account Invoice

Account purchase invoices should contain:

  Field
  -----------------------
  Invoice ID
  Purchase ID
  User
  Purchase date
  Platform
  Account username
  Account type
  Price
  Currency
  Wallet transaction ID
  Purchase status

Purchased credentials may then be displayed securely to the
authenticated purchaser.

------------------------------------------------------------------------

# Notifications

Important marketplace notifications include:

### Successful Purchase

``` text
Account Purchase Successful

Your account has been purchased successfully.
```

### Insufficient Balance

``` text
Insufficient Wallet Balance

Please add funds to your wallet before purchasing this account.
```

### Account Unavailable

``` text
Account No Longer Available

This account was purchased or removed before your transaction completed.
```

------------------------------------------------------------------------

# Background Automation

SMMMARIA uses Node-Cron for automated processing.

  -----------------------------------------------------------------------
  Job                                 Function
  ----------------------------------- -----------------------------------
  Main order synchronization          Synchronizes supplier order
                                      statuses

  Child Panel order synchronization   Synchronizes reseller order
                                      statuses

  Pending payment checks              Reconciles pending payments

  Account/system cleanup              Performs scheduled maintenance
  -----------------------------------------------------------------------

The documented standard order synchronization interval is every **5
minutes** for the main order engine, while the Child Panel sync job runs
every **10 minutes**.

------------------------------------------------------------------------

# Security

SMMMARIA applies several security measures.

  Measure               Implementation
  --------------------- --------------------------------
  Password protection   bcrypt hashing
  Authentication        JWT
  Authorization         User/Admin/Super Admin roles
  Validation            Zod
  HTTP headers          Helmet
  CORS                  Authorized frontend domains
  Rate limiting         Express Rate Limit
  Proxy handling        Railway-compatible Trust Proxy
  Secrets               Environment variables
  Wallet integrity      Firebase transactions
  Price integrity       Backend-authoritative pricing
  Inventory integrity   Transaction/locking approach
  Credential access     Authenticated purchaser only

------------------------------------------------------------------------

# Environment Variables

Sensitive configuration should remain in Railway/environment
configuration and must not be hardcoded.

Examples include:

``` text
FIREBASE_PRIVATE_KEY
FIREBASE_PROJECT_ID
JWT_SECRET
PESAJET_API_KEY
PESAJET_WEBHOOK_SECRET
```

The exact environment-variable names should follow the deployed
application's configuration.

------------------------------------------------------------------------

# Deployment

## Frontend

``` text
GitHub
   ↓
Netlify
   ↓
Frontend Deployment
```

The frontend is deployed through Netlify with automatic SSL and CDN
distribution.

## Backend

``` text
GitHub
   ↓
Railway
   ↓
npm install
   ↓
npm start
   ↓
Node.js / Express
```

Railway provides the public backend HTTPS endpoint and injects
environment variables.

## CI/CD

``` text
Developer Push
      ↓
GitHub Main Branch
      ↓
┌─────┴──────────────┐
▼                    ▼
Netlify             Railway
Frontend             Backend
Deployment           Deployment
```

------------------------------------------------------------------------

# Implementation Guidelines

When adding new functionality:

1.  Inspect the existing architecture first.
2.  Reuse existing authentication.
3.  Reuse the existing wallet.
4.  Reuse the existing notification system.
5.  Reuse the existing invoice system where possible.
6.  Reuse Firebase conventions.
7.  Follow existing naming conventions.
8.  Avoid duplicate functionality.
9.  Keep business logic in services.
10. Keep HTTP handling in controllers.
11. Keep routes focused on endpoint definitions.
12. Avoid unnecessary changes to existing files.
13. Preserve existing SMM order functionality.

------------------------------------------------------------------------

# Testing Requirements

Before considering a feature complete, test:

  Test                                    Expected Result
  --------------------------------------- -------------------------------------
  Successful order                        Order created and balance deducted
  Insufficient balance                    Order rejected
  Supplier failure                        Wallet automatically refunded
  Partial order                           Proportional refund
  Canceled order                          Refund issued
  Successful account purchase             Account sold and wallet charged
  Insufficient account-purchase balance   Purchase rejected
  Two users buy same account              Only one succeeds
  Double-click purchase                   Only one purchase occurs
  Duplicate API request                   Idempotently handled
  Sold account                            Cannot be purchased
  Disabled account                        Cannot be purchased
  Last inventory item                     Category becomes out of stock
  Invoice generation                      Correct invoice created
  Credential access                       Only purchaser can view credentials
  Unauthorized access                     Credentials denied
  Mobile UI                               Responsive and usable
  Admin inventory                         Correct management operations

------------------------------------------------------------------------

# Acceptance Criteria

The platform is considered complete when:

-   Users can browse active SMM services.
-   Users can create orders.
-   The backend validates service quantity limits.
-   The backend uses authoritative selling prices.
-   Wallet deductions are protected by Firebase transactions.
-   Supplier orders are created correctly.
-   Failed supplier requests are refunded.
-   Partial/canceled orders receive proportional refunds.
-   Background jobs synchronize order status.
-   Users can access their order history.
-   Child Panels remain isolated by panel context.
-   Resellers can manage their customers and pricing.
-   Buy Account inventory is maintained independently from SMM services.
-   Sold accounts cannot be purchased again.
-   Out-of-stock categories display correctly.
-   Account prices are determined by the backend.
-   Wallet deductions are performed securely.
-   Purchase records are created.
-   Wallet transaction records are created.
-   Invoices are created.
-   Credentials are only available to the purchaser.
-   Administrators can manage inventory.
-   Existing authentication, wallet, Firebase, notifications, routing
    and SMM order functionality remain intact.

------------------------------------------------------------------------

# High-Level Data Flow

``` text
                         SMMMARIA
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
   Authentication        Wallet            Services
        │                   │                   │
        │                   │                   ▼
        │                   │              Orders
        │                   │                   │
        │                   │                   ▼
        │                   │              Suppliers
        │                   │
        │                   └──────────► Transactions
        │
        ├──────────────► Child Panels
        │
        ├──────────────► Notifications
        │
        ├──────────────► Support
        │
        └──────────────► Buy Account Marketplace
                              │
                              ▼
                       Account Inventory
                              │
                              ▼
                           Purchase
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
                  Wallet    Invoice   Credentials
```

------------------------------------------------------------------------

# Project Status

SMMMARIA is designed as a modular platform so additional services,
suppliers, reseller panels, marketplace categories and administrative
capabilities can be added without replacing the core architecture.

The primary architectural principles are:

> **Security, atomic financial operations, backend-authoritative
> business logic, supplier automation, multi-tenancy, and separation of
> concerns.**

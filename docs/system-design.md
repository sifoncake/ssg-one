# SSG ONE - System Design Document

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Module Communication](#3-module-communication)
4. [Core Features (Phase 1 - MVP)](#4-core-features-phase-1---mvp)
5. [Database Schema](#5-database-schema)
6. [Authentication Flow](#6-authentication-flow)
7. [Future Phases](#7-future-phases)
8. [Technology Stack](#8-technology-stack)

---

## 1. Project Overview

### SSG ONE: Multi-Store Wellness Business Management System

SSG ONE is a comprehensive business management platform designed for Japanese wellness businesses (massage, acupuncture, body care) operating across multiple locations. The system integrates LINE Bot communication with Claude AI assistance to provide a seamless experience for both staff and customers.

### Business Context

- **Industry**: Wellness / Therapeutic Services
- **Target Market**: Multi-location wellness businesses in Japan
- **Initial Deployment**: 3 stores in Tokyo metropolitan area

### Store Locations

| Store | Code | Location | Opened | Status |
|-------|------|----------|--------|--------|
| 渋谷本店 (Shibuya Main) | SBY001 | Tokyo, Shibuya | April 2020 | Active |
| 新宿店 (Shinjuku) | SJK001 | Tokyo, Shinjuku | June 2021 | Active |
| 池袋店 (Ikebukuro) | IKB001 | Tokyo, Ikebukuro | March 2023 | Active |

### Key Objectives

1. **Centralized Management**: Single dashboard for multi-store operations
2. **LINE Integration**: Native communication channel for Japanese market
3. **AI-Powered Support**: Claude AI for customer inquiries and staff assistance
4. **Role-Based Access**: Granular permissions for different staff levels
5. **Multi-Tenant Architecture**: Secure data isolation between stores

---

## 2. System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────┐         ┌───────────────────┐                      │
│   │    Web Browser    │         │    LINE App       │                      │
│   │  (Admin Dashboard)│         │  (Customers/Staff)│                      │
│   └─────────┬─────────┘         └─────────┬─────────┘                      │
│             │                             │                                 │
└─────────────┼─────────────────────────────┼─────────────────────────────────┘
              │                             │
              │ HTTPS                       │ HTTPS
              │                             │
┌─────────────┼─────────────────────────────┼─────────────────────────────────┐
│             ▼                             ▼          APPLICATION LAYER      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────┐   ┌───────────────────────────┐            │
│   │      Next.js 14           │   │      LINE Platform        │            │
│   │      (Vercel)             │   │    Messaging API          │            │
│   │                           │   │                           │            │
│   │  ┌─────────────────────┐  │   └───────────┬───────────────┘            │
│   │  │  React Components   │  │               │                            │
│   │  │  - Dashboard        │  │               │ Webhook                    │
│   │  │  - Staff Mgmt       │  │               │                            │
│   │  │  - Customer Mgmt    │  │               ▼                            │
│   │  │  - Sales Mgmt       │  │   ┌───────────────────────────┐            │
│   │  │  - Analytics        │  │   │    AWS API Gateway        │            │
│   │  └─────────────────────┘  │   └───────────┬───────────────┘            │
│   │                           │               │                            │
│   │  ┌─────────────────────┐  │               ▼                            │
│   │  │    API Routes       │  │   ┌───────────────────────────┐            │
│   │  │  - /api/auth/*      │◄─┼───┤     AWS Lambda (Go)       │            │
│   │  │  - /api/send-line   │  │   │                           │            │
│   │  └─────────────────────┘  │   │  ┌─────────────────────┐  │            │
│   │                           │   │  │     Handlers        │  │            │
│   └───────────────────────────┘   │  │  - LINE Webhook     │  │            │
│                                   │  │  - Auth             │  │            │
│                                   │  │  - Broadcast        │  │            │
│                                   │  │  - Push             │  │            │
│                                   │  └─────────────────────┘  │            │
│                                   │                           │            │
│                                   │  ┌─────────────────────┐  │            │
│                                   │  │     Services        │  │            │
│                                   │  │  - LINE Service     │  │            │
│                                   │  │  - Supabase Service │  │            │
│                                   │  │  - Claude Service   │  │            │
│                                   │  └─────────────────────┘  │            │
│                                   │                           │            │
│                                   └───────────────────────────┘            │
│                                               │                            │
└───────────────────────────────────────────────┼────────────────────────────┘
                                                │
                                                │ HTTPS
                                                │
┌───────────────────────────────────────────────┼────────────────────────────┐
│                                               ▼         DATA LAYER         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────┐       ┌───────────────────────────┐        │
│   │     Supabase              │       │     Claude API            │        │
│   │     (PostgreSQL)          │       │     (Anthropic)           │        │
│   │                           │       │                           │        │
│   │  ┌─────────────────────┐  │       │  - Natural Language       │        │
│   │  │  Tables             │  │       │    Processing             │        │
│   │  │  - stores           │  │       │  - Customer Queries       │        │
│   │  │  - staff            │  │       │  - Intelligent Responses  │        │
│   │  │  - staff_store_*    │  │       │                           │        │
│   │  │  - customers        │  │       └───────────────────────────┘        │
│   │  │  - customer_store_* │  │                                            │
│   │  │  - sales            │  │                                            │
│   │  │  - magic_link_*     │  │                                            │
│   │  │  - admins           │  │                                            │
│   │  │  - line_users       │  │                                            │
│   │  └─────────────────────┘  │                                            │
│   │                           │                                            │
│   │  ┌─────────────────────┐  │                                            │
│   │  │  Features           │  │                                            │
│   │  │  - Row Level Sec.   │  │                                            │
│   │  │  - Auth (Supabase)  │  │                                            │
│   │  │  - Realtime         │  │                                            │
│   │  └─────────────────────┘  │                                            │
│   │                           │                                            │
│   └───────────────────────────┘                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
ssg-one/
├── app/                           # Next.js 14 Frontend
│   ├── api/                       # API Routes
│   │   ├── auth/
│   │   │   ├── create-session/        # Session management
│   │   │   ├── generate-magic-link/   # Magic link generation
│   │   │   ├── verify-liff/           # LIFF token verification
│   │   │   └── verify-magic/          # Magic link verification
│   │   ├── attendance/            # Attendance API
│   │   ├── products/              # Products API
│   │   ├── sales/                 # Sales API
│   │   ├── send-line/             # LINE message proxy
│   │   ├── stores/                # Stores API
│   │   └── user/role/             # User role API
│   │
│   ├── admin/                     # Admin Dashboard Pages
│   │   ├── dashboard/             # Store performance overview
│   │   ├── staff/                 # Staff management
│   │   ├── customers/             # Customer management
│   │   ├── sales/                 # Sales tracking
│   │   ├── stores/                # Store management
│   │   ├── analytics/             # Analytics & reports
│   │   ├── broadcast/             # LINE broadcast
│   │   ├── users/                 # User management
│   │   └── settings/              # System settings
│   │
│   ├── mini-app/                  # LIFF Mini App (runs inside LINE)
│   │   ├── admin-auth/            # Mini app admin authentication
│   │   ├── attendance/            # Attendance clock-in/out
│   │   └── payment/               # Payment flow
│   │       ├── method/            # Payment method selection
│   │       ├── flow/
│   │       │   ├── qr/            # QR code scan (jsQR + html5-qrcode)
│   │       │   ├── card/          # Card payment
│   │       │   ├── cash/          # Cash payment
│   │       │   └── coupon/        # Prepaid ticket
│   │       ├── result/            # Payment result
│   │       └── complete/          # Completion screen
│   │
│   ├── auth/
│   │   └── magic/                 # Magic link landing page
│   │
│   ├── components/                # Shared components
│   │   ├── AdminLayout.tsx        # Admin page wrapper
│   │   └── Navigation.tsx         # Navigation component
│   │
│   ├── login/                     # Login page
│   ├── privacy/                   # Privacy policy
│   ├── signup/                    # Signup page
│   ├── users/                     # Users page
│   └── page.tsx                   # Home page
│
├── lib/                           # Shared utilities
│   ├── supabase.ts                # Supabase client
│   ├── auth-context.tsx           # Auth state management
│   └── fingerprint.ts             # Device fingerprinting
│
├── backend-lambda/                # AWS Lambda Backend (Go)
│   ├── main.go                    # Lambda entry point & router
│   │
│   ├── handlers/                  # Request handlers
│   │   ├── admin_handler.go       # Admin operations
│   │   ├── auth_handler.go        # Authentication
│   │   ├── broadcast_handler.go   # LINE broadcast
│   │   ├── dev_task_handler.go    # Dev task registration (development use)
│   │   ├── line_webhook.go        # LINE webhook processing
│   │   └── push_handler.go        # Push notifications
│   │
│   ├── services/                  # Business logic
│   │   ├── claude_service.go      # Claude API integration
│   │   ├── line_service.go        # LINE API integration
│   │   └── supabase_service.go    # Database operations
│   │
│   ├── models/                    # Data models
│   └── utils/                     # Utilities
│
├── scripts/                       # Database scripts
│   ├── schema-multistore.sql      # Database schema
│   ├── seed-multistore.sql        # Store & staff data
│   ├── seed-multistore-customers.sql
│   ├── seed-multistore-sales.sql
│   ├── migration-add-roles.sql    # Role migration
│   ├── migration-attendance.sql   # Attendance table
│   ├── migration-products.sql     # Products table
│   └── migration-sales-redesign.sql # Sales schema redesign
│
└── docs/                          # Documentation
    ├── system-design.md           # This document
    └── design-considerations.md   # Future considerations
```

---

## 3. Module Communication

### Communication Patterns

#### 3.1 API Gateway Pattern

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│   Client    │─────▶│ API Gateway │─────▶│   Lambda    │
│ (Browser/   │      │   (AWS)     │      │   (Go)      │
│  LINE App)  │◀─────│             │◀─────│             │
└─────────────┘      └─────────────┘      └─────────────┘
```

**Routes:**
| Path | Method | Handler | Description |
|------|--------|---------|-------------|
| `/line-webhook` `/webhook` | POST | LINEWebhookHandler | LINE message events |
| `/send-line` | POST | BroadcastHandler | Broadcast messages |
| `/broadcast` | POST | BroadcastHandler | Broadcast messages (alias) |
| `/send-push` | POST | PushHandler | Push to specific user |
| `/verify-magic` | POST | AuthHandler | Magic link verification |
| `/dev-task-notify` | POST | DevTaskHandler | Dev task notification receiver (development use) |

#### 3.2 LINE Webhook Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│   LINE   │────▶│  Lambda  │────▶│ Supabase │────▶│  Claude  │
│(LINE App)│     │ Platform │     │          │     │          │     │   API    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘     └──────────┘
     ▲                                  │                                 │
     │                                  │                                 │
     └──────────────────────────────────┴─────────────────────────────────┘
                              Reply via LINE API
```

**Message Flow:**
1. User sends message via LINE
2. LINE Platform sends webhook to Lambda
3. Lambda parses event and identifies user
4. User profile upserted to Supabase
5. Message routed:
   - "管理画面" → Admin magic link flow
   - Other → Claude AI for response
6. Response sent back via LINE Reply API

#### 3.3 Magic Link Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Magic Link Authentication                       │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Request Magic Link
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│   User   │────▶│   LINE   │────▶│  Lambda  │────▶│ Supabase │
│"管理画面"│     │ Webhook  │     │ Admin    │     │ Insert   │
└──────────┘     └──────────┘     │ Handler  │     │ Token    │
     ▲                            └──────────┘     └──────────┘
     │                                  │
     └──────────────────────────────────┘
           Magic Link + 2FA Code via LINE

Step 2: Verify Magic Link
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Browser  │────▶│ Next.js  │────▶│  Lambda  │────▶│ Supabase │
│ Click    │     │ /auth/   │     │ Auth     │     │ Verify   │
│ Link     │     │ magic    │     │ Handler  │     │ Token    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                  │
     │                                  │
     ▼                                  │
┌──────────┐                            │
│  2FA     │◀───────────────────────────┘
│ Required │        (If new device)
└──────────┘
```

#### 3.4 Frontend-Backend Communication

```typescript
// Next.js API Route → Lambda
const apiUrl = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/endpoint`
  : '/api/endpoint';  // Local development fallback
```

**Environment Configuration:**
- **Local Dev**: Next.js API routes → Direct Supabase
- **Production**: Next.js API routes → Lambda → Supabase

---

## 4. Core Features (Phase 1 - MVP)

### 4.1 Admin Dashboard

**Purpose**: Centralized view of business performance across all stores.

**Components**:
- **Summary Cards**: Total customers, sales count, total revenue
- **Store Performance**: Monthly progress vs. targets by store
- **Recent Sales**: Latest transactions across all stores
- **Month Selector**: Historical data viewing

**Key Metrics**:
- Revenue by store (actual vs. target)
- Transaction count
- Achievement percentage (color-coded)

### 4.2 Staff Management

**Features**:
- Staff list with role badges
- Home store and current assignments
- Assignment history (transfers, temporary support)
- Multi-store staff tracking

**Role Hierarchy**:
| Role | Level | Japanese | Access Scope |
|------|-------|----------|--------------|
| staff | 1 | 一般従業員 | Assigned store(s) only |
| store_manager | 2 | 店舗管理者 | Assigned store(s) only |
| regional_manager | 3 | 全店管理者 | All stores |
| system_admin | 4 | システム管理者 | All stores + system |

### 4.3 Customer Management

**Features**:
- Customer list with type classification
- Multi-store visit history
- Lifetime value (LTV) tracking
- Customer segmentation

**Customer Types**:
| Type | Criteria | Count |
|------|----------|-------|
| VIP | High spend, multi-store | 5 |
| multi-store | Visits 2+ stores | 20 |
| regular | Single store loyal | 30 |
| new | Recent first visit | 10 |

### 4.4 Sales Management

**Features**:
- Transaction logging
- Item type categorization
- Payment method tracking
- Staff attribution

**Item Types**:
- 施術 (Treatment): Massage, acupuncture, body care
- 物販 (Retail): Products, supplements
- 回数券 (Tickets): Prepaid service packages

**Payment Methods**:
- 現金 (Cash)
- カード (Credit Card)
- QRコード (QR Payment)
- 回数券 (Prepaid Ticket)

### 4.5 LIFF Mini App

A LIFF (LINE Front-end Framework) app running inside LINE's WebView. Used by staff for day-to-day operations.

**Entry point**: Staff sends "メニュー" via LINE → receives LIFF URL → app opens in LINE's built-in browser.

**Screens**:

| Screen | Path | Purpose |
|--------|------|---------|
| Attendance | `/mini-app/attendance` | Clock in / clock out |
| Payment method | `/mini-app/payment/method` | Select payment type |
| QR payment | `/mini-app/payment/flow/qr` | QR code scan & provider detection |
| Card payment | `/mini-app/payment/flow/card` | Card payment flow |
| Cash payment | `/mini-app/payment/flow/cash` | Cash payment flow |
| Prepaid ticket | `/mini-app/payment/flow/coupon` | Coupon payment flow |
| Payment result | `/mini-app/payment/result` | Confirmation & completion |

**QR Payment Implementation**:
- `html5-qrcode` (ZXing) for scanning; `jsQR` for corner detection on the same captured frame
- Polygon overlay drawn from the 4 detected corner points (handles tilted QR codes)
- Multiple QR codes in frame: validated via `code.data === decodedText` identity check
- If corners cannot be detected, auto-rescans with a toast notification

**Payment Provider Detection**: URL pattern matching against PayPay / LINE Pay / Rakuten Pay / d払い / au PAY / Merpay

### 4.6 LINE Bot Integration

**Capabilities**:
- **Customer Queries**: Natural language responses via Claude AI
- **Admin Access**: "管理画面" keyword triggers magic link
- **Broadcast**: Send messages to all LINE friends
- **Push**: Send to specific users

**Message Routing**:
```go
switch {
case trimmedMessage == "管理画面":
    // マジックリンク生成・送信
case trimmedMessage == "メニュー":
    // LIFFミニアプリURL返却
case strings.HasPrefix(trimmedMessage, "dev\n"),
     strings.HasPrefix(trimmedMessage, "dev-deploy\n"):
    // Devタスク登録（DEV_LINE_USER_IDのみ許可）
default:
    // Claude AIへ転送
}
```

---

## 5. Database Schema

### Entity Relationship Diagram

```
                                    ┌─────────────────┐
                                    │     stores      │
                                    ├─────────────────┤
                                    │ id (PK)         │
                                    │ store_code      │
                                    │ store_name      │
                                    │ location        │
                                    │ opening_date    │
                                    │ monthly_target  │
                                    │ status          │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
              ▼                              ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────┐    ┌─────────────────────────┐
│        staff            │    │       customers         │    │         sales           │
├─────────────────────────┤    ├─────────────────────────┤    ├─────────────────────────┤
│ id (PK)                 │    │ id (PK)                 │    │ id (PK)                 │
│ line_user_id            │    │ line_user_id            │    │ sale_code               │
│ staff_code              │    │ customer_code           │    │ date                    │
│ name                    │    │ name                    │    │ store_id (FK)           │
│ role                    │    │ email                   │    │ customer_id (FK)        │
│ email                   │    │ phone                   │    │ staff_id (FK)           │
│ home_store_id (FK)      │    │ first_visit_date        │    │ item_name               │
│ status                  │    │ primary_store_id (FK)   │    │ item_type               │
└───────────┬─────────────┘    │ customer_type           │    │ amount                  │
            │                  └───────────┬─────────────┘    │ payment_method          │
            │                              │                  └─────────────────────────┘
            ▼                              ▼
┌─────────────────────────┐    ┌─────────────────────────┐
│ staff_store_assignments │    │ customer_store_history  │
├─────────────────────────┤    ├─────────────────────────┤
│ id (PK)                 │    │ id (PK)                 │
│ staff_id (FK)           │    │ customer_id (FK)        │
│ store_id (FK) *nullable │    │ store_id (FK)           │
│ assignment_type         │    │ first_visit             │
│ role                    │    │ last_visit              │
│ start_date              │    │ visit_count             │
│ end_date                │    │ total_spent             │
└─────────────────────────┘    └─────────────────────────┘

* store_id is NULL for regional_manager and system_admin roles
```

### Key Tables

#### stores
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT UNIQUE NOT NULL,
  store_name TEXT NOT NULL,
  location TEXT NOT NULL,
  opening_date DATE NOT NULL,
  manager_name TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'closed', 'renovation')),
  monthly_target INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### staff_store_assignments (Role-Based Access)
```sql
CREATE TABLE staff_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  assignment_type TEXT NOT NULL
    CHECK (assignment_type IN ('permanent', 'temporary')),
  role TEXT NOT NULL DEFAULT 'staff'
    CHECK (role IN ('staff', 'store_manager', 'regional_manager', 'system_admin')),
  start_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: store_id must be NULL for regional/system roles
  CONSTRAINT check_role_store_combination CHECK (
    (role IN ('regional_manager', 'system_admin') AND store_id IS NULL) OR
    (role IN ('staff', 'store_manager') AND store_id IS NOT NULL)
  )
);
```

### Reference Documentation

For complete schema details, see:
- [`scripts/schema-multistore.sql`](../scripts/schema-multistore.sql)
- [`scripts/README-multistore.md`](../scripts/README-multistore.md)

---

## 6. Authentication Flow

### Overview

SSG ONE uses a passwordless authentication system combining:
1. **Magic Link**: One-time URL sent via LINE
2. **2FA**: Verification code for new devices
3. **Device Fingerprinting**: Trust known devices

### Detailed Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

1. USER REQUESTS ACCESS
   ┌──────────┐                    ┌──────────┐
   │   User   │   "管理画面"      │   LINE   │
   │  (LINE)  │ ─────────────────▶│  Server  │
   └──────────┘                    └────┬─────┘
                                        │
                                        ▼
2. TOKEN GENERATION                ┌──────────┐
                                   │  Lambda  │
   - Generate unique token         │  Admin   │
   - Generate 6-digit 2FA code     │ Handler  │
   - Store in magic_link_tokens    └────┬─────┘
   - Set 15-min expiration              │
                                        ▼
3. SEND MAGIC LINK                 ┌──────────┐
   ┌──────────┐                    │ Supabase │
   │   User   │ ◀─── Magic Link ───│ + LINE   │
   │  (LINE)  │      + 2FA Code    │  Reply   │
   └──────────┘                    └──────────┘

4. USER CLICKS LINK
   ┌──────────┐                    ┌──────────┐
   │ Browser  │ ───────────────────▶│ Next.js  │
   │          │    /auth/magic     │ /auth/   │
   │          │    ?token=xxx      │ magic    │
   └──────────┘                    └────┬─────┘
                                        │
5. TOKEN VERIFICATION                   ▼
                                   ┌──────────┐
   - Validate token exists         │  Lambda  │
   - Check expiration              │   Auth   │
   - Check if already used         │ Handler  │
   - Compare device fingerprint    └────┬─────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
           ┌──────────────┐                        ┌──────────────┐
           │ SAME DEVICE  │                        │ NEW DEVICE   │
           │              │                        │              │
           │ Skip 2FA     │                        │ Require 2FA  │
           │ Grant Access │                        │ Enter Code   │
           └──────────────┘                        └──────┬───────┘
                                                          │
                                                          ▼
                                                  ┌──────────────┐
                                                  │ VERIFY 2FA   │
                                                  │              │
                                                  │ - Check code │
                                                  │ - Grant/Deny │
                                                  └──────────────┘

6. SESSION CREATION
   - Mark token as used
   - Create Supabase session
   - Redirect to dashboard
```

### Security Features

| Feature | Implementation |
|---------|----------------|
| Token Expiration | 15 minutes |
| Single Use | Token marked as used after verification |
| 2FA Code | 6-digit numeric, sent via LINE |
| Device Trust | LINE User ID as fingerprint |
| Rate Limiting | Handled by API Gateway |

### Token Storage

```sql
-- magic_link_tokens table (simplified)
CREATE TABLE magic_link_tokens (
  id UUID PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  line_user_id TEXT NOT NULL,
  two_factor_code TEXT NOT NULL,
  fingerprint TEXT,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 7. Future Phases

### Phase 2: Enhanced Operations

| Feature | Description | Priority |
|---------|-------------|----------|
| Meeting Transcription | Voice-to-text for staff meetings | High |
| Mental Health Tracking | Staff wellness monitoring | Medium |
| Appointment Scheduling | Online booking system | High |
| Inventory Management | Stock tracking across stores | Medium |
| Staff Certifications | Qualification tracking | Low |

### Phase 3: Customer Experience

| Feature | Description | Priority |
|---------|-------------|----------|
| Customer Booking | LINE-based appointment booking | High |
| Payment Integration | Online payment processing | High |
| Loyalty Program | Points and rewards system | Medium |
| Customer Portal | Self-service account management | Medium |
| Review System | Service feedback collection | Low |

### Technical Improvements

| Area | Improvement |
|------|-------------|
| Performance | Materialized views for analytics |
| Scalability | Database partitioning by date |
| Security | Enhanced RLS policies |
| Monitoring | Application performance monitoring |
| Testing | E2E test coverage |

### Deferred Design Decisions

See [`docs/design-considerations.md`](./design-considerations.md) for:
- Multiple LINE ID support per person
- Person deduplication (name matching)
- GDPR compliance features
- Complex permission hierarchies

---

## 8. Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Utility-first styling |
| React | 18.x | UI component library |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.21+ | Lambda function language |
| AWS Lambda | - | Serverless compute |
| AWS API Gateway | V2 | HTTP API routing |

### Database

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | - | PostgreSQL as a service |
| PostgreSQL | 15.x | Primary database |
| Row Level Security | - | Multi-tenant data isolation |

### External Services

| Service | Purpose |
|---------|---------|
| Claude API (Anthropic) | AI-powered responses |
| LINE Messaging API | Customer/Staff communication |
| LINE Login | OAuth authentication |

### Deployment

| Component | Platform | Region |
|-----------|----------|--------|
| Frontend | Vercel | Auto (Edge) |
| Backend | AWS Lambda | ap-northeast-1 |
| Database | Supabase | ap-northeast-1 |

### Development Tools

| Tool | Purpose |
|------|---------|
| Git | Version control |
| npm | Package management |
| ESLint | Code linting |
| Prettier | Code formatting |

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-02-04 | SSG ONE Team | Initial system design document |
| 1.1 | 2026-03-24 | SSG ONE Team | Added LIFF mini app, attendance, LIFF auth, dev command, and additional API routes |

---

## References

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [LINE Messaging API](https://developers.line.biz/en/docs/messaging-api/)
- [Claude API Documentation](https://docs.anthropic.com/)
- [AWS Lambda Go](https://docs.aws.amazon.com/lambda/latest/dg/golang-handler.html)

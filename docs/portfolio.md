# SSG ONE - Multi-Store Wellness Business Management Platform

## Project Summary

**SSG ONE** is a full-stack SaaS platform designed for multi-location wellness businesses in Japan. The system combines customer-facing LINE messaging with internal AI assistance, providing seamless business operations management across multiple store locations.

**Elevator Pitch:** A cloud-native business management solution that combines real-time analytics, AI-assisted operations, and sophisticated role-based access control to streamline operations for wellness businesses operating across multiple locations.

**Target Audience:** Multi-store wellness businesses (massage, acupuncture, body care) requiring centralized management of staff, customers, sales, and cross-location operations.

**Problem Solved:** Eliminated fragmented data silos and manual coordination between stores by providing a unified platform with real-time visibility, streamlined messaging operations, and secure multi-tenant data management.

---

## Technical Highlights

| Aspect | Implementation |
|--------|----------------|
| **Architecture** | Serverless API built around API Gateway + Lambda |
| **Frontend** | Server-side rendered React app with Next.js 16 App Router |
| **Backend** | High-performance Go-based AWS Lambda functions |
| **Database** | Supabase PostgreSQL with multi-tenant design |
| **AI Integration** | Claude API for internal message assistance |
| **Authentication** | Passwordless magic link with 2FA and device fingerprinting |
| **Messaging** | Real-time LINE Bot webhook processing and customer broadcasts |

---

## Key Features Implemented

### Admin Dashboard
- Real-time store performance metrics with month-over-month comparison
- Revenue tracking against monthly targets with visual progress indicators
- Cross-store analytics with drill-down capabilities
- Dynamic date range selection with historical data support

### Role-Based Access Control
Implemented a flexible 4-tier permission system:

| Role | Access Scope | Capabilities |
|------|--------------|--------------|
| System Admin | All stores + settings | Full platform access |
| Regional Manager | All stores | Cross-store operations |
| Store Manager | Assigned store(s) | Staff and transaction management |
| Staff | Assigned store(s) | Basic operations |

Key design: Roles are assigned at the store-assignment level, allowing the same user to have different permissions at different locations.

### Multi-Store Data Management
- Staff transfer and temporary assignment tracking
- Cross-store customer visit history
- Multi-location ticket package redemption
- Store-specific monthly targets and performance metrics

### LINE Operations (Customer-facing)
- Webhook-based real-time message processing
- Admin access trigger via keyword detection
- Broadcast and targeted push messaging capabilities

### AI Assistance (Internal)
- Claude API integration for message drafting and ops support

### Authentication System
- Magic link generation and verification
- Device fingerprinting for trusted device recognition
- 6-digit 2FA code for new device verification
- LIFF ID token validation for in-app authentication
- 10-minute token expiration with single-use enforcement

### Sales & CRM
- Transaction logging with item type categorization
- Multiple payment method support
- Staff performance attribution
- Customer lifetime value (LTV) tracking
- Customer segmentation (VIP, multi-store, regular, new)

---

## Technology Stack

### Frontend
```
Next.js 16        - React framework with App Router
TypeScript 5      - End-to-end type safety
Tailwind CSS 4    - Utility-first styling
React Context     - State management
```

### Backend
```
Go 1.21+          - Lambda function runtime
AWS Lambda        - Serverless compute
API Gateway V2    - HTTP API routing with CORS
```

### Database
```
PostgreSQL 15     - Primary database (Supabase)
Row Level Security - Multi-tenant data isolation
Indexed queries   - Optimized for time-series analytics
```

### External Services
```
Claude API        - Internal message assistance (Anthropic)
LINE Messaging API - Customer/staff communication
LINE Login        - OAuth authentication
```

### Deployment
```
Vercel            - Frontend hosting (Edge network)
AWS Lambda        - Backend compute (ap-northeast-1)
Supabase          - Database hosting (ap-northeast-1)
```

---

## Architecture & Design Decisions

### Serverless Architecture
**Decision:** AWS Lambda + API Gateway for backend services

**Rationale:**
- Zero infrastructure management
- Auto-scaling for webhook traffic spikes
- Pay-per-execution cost model ideal for variable traffic
- Sub-second cold starts with Go runtime

### Multi-Tenant Database Design
**Decision:** Single database with multi-tenant design

**Rationale:**
- Simplified maintenance vs. database-per-tenant
- Tenant-aware data isolation design
- Efficient cross-store analytics queries
- Cost-effective for initial scale

### Magic Link Authentication
**Decision:** Passwordless auth via LINE with 2FA fallback

**Rationale:**
- Leverages existing LINE identity (ubiquitous in Japan)
- Eliminates password management burden
- Device fingerprinting reduces 2FA friction for trusted devices
- Secure token lifecycle (10-min expiry, single-use)

### Type-Safe Development
**Decision:** TypeScript frontend + Go backend with strict typing

**Rationale:**
- Compile-time error detection
- Self-documenting API contracts
- Reduced runtime errors in production
- Improved developer experience with IDE support

### Hybrid API Architecture
**Decision:** Next.js API routes + Lambda functions

**Rationale:**
- Local development simplicity with Next.js routes
- Production scalability with Lambda
- Environment-based routing for seamless switching
- Reduced latency for frontend-to-API calls on Vercel

---

## Challenges Overcome

### Complex Multi-Store Data Modeling
**Challenge:** Staff can work at multiple stores with different roles; customers visit multiple locations.

**Solution:** Implemented junction tables (`staff_store_assignments`, `customer_store_history`) with temporal tracking (start/end dates) and role-per-assignment design. Database constraints ensure data integrity for role-store combinations.

### Real-Time Authentication via LINE
**Challenge:** Secure admin access initiated from LINE chat without traditional login forms.

**Solution:** Designed a multi-step authentication flow:
1. Keyword detection triggers token generation
2. Magic link + 2FA code sent via LINE reply
3. Browser verification with device fingerprinting
4. LIFF ID token validation for in-app scenarios
5. Conditional 2FA based on device trust

### Type-Safe Supabase Integration
**Challenge:** Supabase returns dynamic types; ensuring type safety with complex JOINs.

**Solution:** Created explicit TypeScript interfaces for all database responses. Implemented type guards and explicit casting for Supabase query results. Eliminated all `any` types through strict type definitions.

### Cross-Year Date Range Queries
**Challenge:** Month selection must handle year boundaries and dynamic date ranges.

**Solution:** Implemented dynamic month-end calculation accounting for varying month lengths. Used parameterized date queries with proper timezone handling. Auto-detection of latest data month for initial load.

### Historical Data with Live Updates
**Challenge:** Dashboard must show historical months while reflecting the most recent data state.

**Solution:** Separated data fetching from display logic. Implemented month selector that queries data based on selection while maintaining referential integrity. Added initialization logic to detect the latest month with available data.

---

## Results & Metrics

| Metric | Value |
|--------|-------|
| Stores Supported | 3 locations |
| Staff Managed | 30 employees |
| Customers Tracked | 65+ with segmentation |
| Transactions Processed | 4,000+ records |
| Permission Levels | 4-tier RBAC |
| Code Quality | Zero `any` types (strict TypeScript) |
| API Response Time | < 200ms average (Lambda) |
| Authentication | < 3 seconds end-to-end |

### Business Value Delivered
- **Unified Operations:** Single dashboard replaces multiple spreadsheets
- **Real-Time Visibility:** Instant access to cross-store performance
- **Reduced Admin Overhead:** AI-assisted messaging operations
- **Secure Access:** Role-based permissions with audit trail
- **Scalable Foundation:** Architecture supports additional stores without refactoring

---

## Screenshots & Demo

*Screenshots are in preparation.*

- Admin Dashboard
- LINE Bot Interface
- Staff Management

---

## Source Code

**Repository:**
https://github.com/sifoncake/ssg-one

**Code Highlights:**
- `/app` - Next.js 16 frontend with App Router
- `/backend-lambda` - Go-based serverless functions
- `/lib` - Shared utilities and authentication context
- `/scripts` - Database schema and seed data

---

## Future Roadmap

| Phase | Features |
|-------|----------|
| Phase 2 | Appointment scheduling, inventory management, meeting transcription |
| Phase 3 | Customer booking portal, payment integration, loyalty program |

---

*Last Updated: February 2025*

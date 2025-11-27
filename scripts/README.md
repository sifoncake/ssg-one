# Seed Data Setup Instructions

## Overview
This document explains how to populate the Supabase database with realistic Japanese business data for staff, customers, and sales.

## Database Tables

### 1. Staff Table
- **Purpose**: Store employee information
- **Fields**: id, line_user_id, name, role, email, phone, hire_date, status, created_at
- **Sample Data**: 10 employees (2 managers, 8 employees)

### 2. Customers Table
- **Purpose**: Store customer information and visit history
- **Fields**: id, line_user_id, name, email, phone, first_visit, last_visit, total_visits, total_spent, notes, created_at
- **Sample Data**: 20 customers with varying visit patterns

### 3. Sales Table
- **Purpose**: Store transaction records
- **Fields**: id, date, customer_id, staff_id, item_name, item_type, amount, payment_method, created_at
- **Sample Data**: ~3 months of transactions (Nov 2024 - Jan 2025)

## Setup Steps

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**

### Step 2: Run the Seed Script
1. Open the file: `scripts/seed.sql`
2. Copy the entire content
3. Paste into the Supabase SQL Editor
4. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### Step 3: Verify Data Creation
Run these queries to verify:

```sql
-- Check staff count
SELECT COUNT(*) FROM staff;
-- Should return: 10

-- Check customers count
SELECT COUNT(*) FROM customers;
-- Should return: 20

-- Check sales count
SELECT COUNT(*) FROM sales;
-- Should return: ~60-90 (random generation)

-- View sample data
SELECT * FROM staff LIMIT 5;
SELECT * FROM customers LIMIT 5;
SELECT * FROM sales LIMIT 10;
```

### Step 4: Set Up Row Level Security (Optional but Recommended)

```sql
-- Enable RLS
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read staff"
  ON staff FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);
```

## Display Pages

### Available Admin Pages

1. **従業員管理** (`/admin/staff`)
   - View all staff members
   - See role, hire date, and status
   - Color-coded badges (管理者=purple, 従業員=blue)

2. **顧客管理** (`/admin/customers`)
   - View all customers
   - See visit count and total spent
   - Sort by recent activity
   - View customer notes

3. **売上管理** (`/admin/sales`)
   - View all transactions
   - Filter by date range and item type
   - See total revenue
   - Monthly revenue breakdown chart
   - Detailed transaction table with customer/staff names

### Navigation
All pages are accessible from the admin sidebar menu:
- 👥 従業員管理
- 💼 顧客管理
- 💰 売上管理

## Data Details

### Staff Members (10 total)
- **Managers (2)**: 山田 太郎, 佐藤 花子
- **Employees (8)**: 鈴木 一郎, 田中 美咲, 伊藤 健太, 渡辺 愛, 高橋 大輔, 小林 さくら, 中村 優, 加藤 麻衣

### Customer Profile Examples
- **VIP Customer**: 岡田 優子 (20 visits, ¥520,000 spent)
- **Regular Customer**: 高田 真由美 (24 visits, ¥456,000 spent)
- **New Customer**: 三浦 裕也 (1 visit, ¥25,000 spent)

### Service Types & Pricing
- **施術 (Treatment)**: ¥3,000 - ¥8,000
  - 全身マッサージ60分: ¥6,000
  - 部分マッサージ30分: ¥4,000
  - 美容鍼灸: ¥8,000
  - 骨盤矯正: ¥7,500
  - 指圧マッサージ45分: ¥5,500

- **物販 (Retail)**: ¥3,000 - ¥5,000
  - アロマオイル: ¥3,000
  - サプリメント: ¥5,000

- **回数券 (Ticket)**: ¥25,000
  - 回数券（5回分）: ¥25,000

### Payment Methods
- 現金 (Cash)
- カード (Credit Card)
- QRコード (QR Payment)
- 回数券 (Prepaid Ticket)

## Troubleshooting

### Issue: Tables already exist
**Solution**: Drop existing tables first:
```sql
DROP TABLE IF EXISTS sales;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS staff;
```
Then run the seed script again.

### Issue: Foreign key constraint error
**Solution**: Make sure to drop tables in the correct order (sales → customers → staff) due to foreign key relationships.

### Issue: No data showing in admin pages
**Solution**:
1. Check Supabase connection in `.env.local`
2. Verify RLS policies are set up correctly
3. Check browser console for errors

## Sample Queries

### Top 5 Customers by Spending
```sql
SELECT name, total_visits, total_spent
FROM customers
ORDER BY total_spent DESC
LIMIT 5;
```

### Monthly Revenue Summary
```sql
SELECT
  TO_CHAR(date, 'YYYY-MM') as month,
  COUNT(*) as transaction_count,
  SUM(amount) as total_revenue
FROM sales
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month DESC;
```

### Staff Performance
```sql
SELECT
  s.name as staff_name,
  COUNT(sa.id) as transaction_count,
  SUM(sa.amount) as total_sales
FROM staff s
LEFT JOIN sales sa ON s.id = sa.staff_id
GROUP BY s.id, s.name
ORDER BY total_sales DESC;
```

## Next Steps

After seeding the data:
1. Access the admin dashboard at `/admin/dashboard`
2. Navigate to each new page to view the data
3. Test filtering and sorting features
4. Customize the pages based on your business needs

## Support

If you encounter any issues:
1. Check the Supabase logs
2. Verify all environment variables are set
3. Ensure you're authenticated as an admin user

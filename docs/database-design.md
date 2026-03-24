# SSG ONE データベース設計書

## 概要

SSG ONEは多店舗対応のウェルネスビジネス管理システムです。
データベースはSupabase (PostgreSQL) を使用しています。

---

## ER図（簡易版）

```
stores ─────────┬──────────────────┬─────────────────┐
                │                  │                 │
           staff_store_      attendance          sales
           assignments            │                 │
                │                 │                 │
              staff ─────────────┴─────────────────┤
                                                   │
                                              sale_items

customers ─────────────────────────────────────────┘
     │
customer_store_history

products (独立)
dev_tasks (独立)
admins / admin_tokens / line_users (認証系)
```

---

## テーブル一覧

| テーブル名 | 説明 | 種別 |
|-----------|------|------|
| stores | 店舗マスタ | マスタ |
| staff | スタッフマスタ | マスタ |
| staff_store_assignments | スタッフ配属 | トランザクション |
| customers | 顧客マスタ | マスタ |
| customer_store_history | 顧客来店履歴 | トランザクション |
| products | 商品マスタ | マスタ |
| sales | 売上ヘッダー | トランザクション |
| sale_items | 売上明細 | トランザクション |
| attendance | 勤怠記録 | トランザクション |
| dev_tasks | 開発タスク | システム |
| admins | 管理者 | 認証 |
| admin_tokens | マジックリンクトークン | 認証 |
| line_users | LINEユーザー | 認証 |

---

## テーブル詳細

### stores（店舗マスタ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| store_code | TEXT | NO | - | 店舗コード（ユニーク） |
| store_name | TEXT | NO | - | 店舗名 |
| location | TEXT | NO | - | 所在地 |
| opening_date | DATE | NO | - | 開店日 |
| manager_name | TEXT | YES | - | 店長名 |
| phone | TEXT | YES | - | 電話番号 |
| status | TEXT | NO | 'active' | 状態: active/closed/renovation |
| monthly_target | INTEGER | YES | 0 | 月間売上目標 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

---

### staff（スタッフマスタ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| line_user_id | TEXT | YES | - | LINE User ID（ユニーク） |
| staff_code | TEXT | NO | - | スタッフコード（ユニーク） |
| name | TEXT | NO | - | 氏名 |
| role | TEXT | NO | - | 役割: 経営者/管理者/店長/副店長/従業員/端末 |
| email | TEXT | YES | - | メールアドレス |
| phone | TEXT | YES | - | 電話番号 |
| hire_date | DATE | NO | - | 入社日 |
| home_store_id | UUID | YES | - | 所属店舗 → stores.id |
| device_code | TEXT | YES | - | 端末コード（role=端末の場合） |
| status | TEXT | NO | 'active' | 状態: active/inactive/transferred |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

**制約:**
- `role` が '端末' の場合、`device_code` は必須

---

### staff_store_assignments（スタッフ配属）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| staff_id | UUID | NO | - | → staff.id |
| store_id | UUID | YES | - | → stores.id（NULL=全店舗） |
| assignment_type | TEXT | NO | - | permanent/temporary |
| role | TEXT | NO | 'staff' | staff/store_manager/regional_manager/system_admin |
| start_date | DATE | NO | - | 配属開始日 |
| end_date | DATE | YES | - | 配属終了日（NULL=現在有効） |
| reason | TEXT | YES | - | 異動理由 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

**制約:**
- `role` が regional_manager/system_admin の場合、`store_id` は NULL
- `role` が staff/store_manager の場合、`store_id` は必須

---

### customers（顧客マスタ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| line_user_id | TEXT | YES | - | LINE User ID（ユニーク） |
| customer_code | TEXT | NO | - | 顧客コード（ユニーク） |
| name | TEXT | NO | - | 氏名 |
| email | TEXT | YES | - | メールアドレス |
| phone | TEXT | YES | - | 電話番号 |
| first_visit_date | DATE | NO | - | 初回来店日 |
| last_visit_date | DATE | NO | - | 最終来店日 |
| primary_store_id | UUID | YES | - | メイン店舗 → stores.id |
| total_visits | INTEGER | YES | 0 | 累計来店回数 |
| total_spent | INTEGER | YES | 0 | 累計利用金額 |
| customer_type | TEXT | YES | - | regular/multi-store/new/vip |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

---

### customer_store_history（顧客来店履歴）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| customer_id | UUID | NO | - | → customers.id |
| store_id | UUID | NO | - | → stores.id |
| first_visit | DATE | NO | - | 初回来店日 |
| last_visit | DATE | NO | - | 最終来店日 |
| visit_count | INTEGER | YES | 0 | 来店回数 |
| total_spent | INTEGER | YES | 0 | 利用金額 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

---

### products（商品マスタ）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| store_id | UUID | YES | - | → stores.id（NULL=全店共通） |
| name | TEXT | NO | - | 商品名 |
| type | TEXT | NO | - | 施術/物販/回数券 |
| price | INTEGER | NO | - | 税込価格（円） |
| tax_rate | INTEGER | NO | 10 | 消費税率（%） |
| is_active | BOOLEAN | NO | true | 有効フラグ |
| sort_order | INTEGER | NO | 0 | 表示順 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

---

### sales（売上ヘッダー）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| sale_code | TEXT | NO | - | 売上コード（ユニーク） |
| date | DATE | NO | - | 売上日 |
| store_id | UUID | NO | - | → stores.id |
| staff_id | UUID | YES | - | → staff.id |
| customer_id | UUID | YES | - | → customers.id（NULL=ゲスト） |
| subtotal | INTEGER | NO | - | 税抜小計 |
| tax_amount_10 | INTEGER | NO | 0 | 10%消費税額 |
| tax_amount_8 | INTEGER | NO | 0 | 8%消費税額（軽減税率） |
| discount | INTEGER | NO | 0 | 値引額 |
| discount_reason | TEXT | YES | - | 値引理由 |
| total_amount | INTEGER | NO | - | 合計金額 |
| payment_method | TEXT | NO | - | 現金/カード/QRコード/回数券 |
| status | TEXT | NO | 'completed' | completed/voided/refunded |
| voided_at | TIMESTAMPTZ | YES | - | 取消日時 |
| voided_by | UUID | YES | - | 取消者 → staff.id |
| voided_reason | TEXT | YES | - | 取消理由 |
| refunded_at | TIMESTAMPTZ | YES | - | 返金日時 |
| refunded_by | UUID | YES | - | 返金者 → staff.id |
| refunded_reason | TEXT | YES | - | 返金理由 |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

**売上コード形式:** `{店舗コード10桁}-{R/S+5桁}-{YYYYMMDDHHmmss}-{通番6桁}`

---

### sale_items（売上明細）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| sale_id | UUID | NO | - | → sales.id |
| item_name | TEXT | NO | - | 商品名 |
| item_type | TEXT | NO | - | 施術/物販/回数券 |
| quantity | INTEGER | NO | 1 | 数量 |
| unit_price | INTEGER | NO | - | 単価 |
| tax_rate | INTEGER | NO | 10 | 適用税率（%） |
| amount | INTEGER | NO | - | 小計（quantity × unit_price） |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |

---

### attendance（勤怠記録）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| staff_id | UUID | NO | - | → staff.id |
| store_id | UUID | NO | - | → stores.id |
| date | DATE | NO | - | 勤務日 |
| clock_in | TIMESTAMPTZ | YES | - | 出勤時刻 |
| clock_out | TIMESTAMPTZ | YES | - | 退勤時刻 |
| break_minutes | INTEGER | YES | 0 | 休憩時間（分） |
| notes | TEXT | YES | - | 備考 |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

**制約:** staff_id + date でユニーク（1日1レコード）

---

### dev_tasks（開発タスク）

| カラム | 型 | NULL | デフォルト | 説明 |
|--------|-----|------|-----------|------|
| id | UUID | NO | gen_random_uuid() | 主キー |
| user_id | TEXT | NO | - | LINE User ID |
| instruction | TEXT | NO | - | 実行指示 |
| status | TEXT | NO | 'pending' | pending/running/done/failed |
| result | TEXT | YES | - | 実行結果 |
| allow_git_operations | BOOLEAN | NO | false | Git操作許可フラグ |
| created_at | TIMESTAMPTZ | NO | NOW() | 作成日時 |
| updated_at | TIMESTAMPTZ | NO | NOW() | 更新日時 |

---

## 認証系テーブル

### admins（管理者マスタ）

LINE Bot経由で管理画面にアクセスできるユーザーの管理。

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| line_user_id | TEXT | NO | LINE User ID（主キー相当） |
| email | TEXT | NO | メールアドレス |

---

### admin_tokens（マジックリンクトークン）

マジックリンク認証用の一時トークン。有効期限は**10分・使い捨て**。

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| token | TEXT | NO | ワンタイムトークン（ユニーク） |
| line_user_id | TEXT | NO | 発行対象のLINE User ID |
| two_factor_code | TEXT | NO | 6桁の2FAコード |
| fingerprint | TEXT | YES | デバイスフィンガープリント（LINE User IDを使用） |
| expires_at | TIMESTAMPTZ | NO | 有効期限（発行から10分） |
| used | BOOLEAN | NO | 使用済みフラグ（default: false） |
| created_at | TIMESTAMPTZ | NO | 作成日時 |

---

### line_users（LINEユーザー）

LINE Botと会話したユーザーを自動登録するテーブル。

| カラム | 型 | NULL | 説明 |
|--------|-----|------|------|
| line_user_id | TEXT | NO | LINE User ID（ユニーク） |
| display_name | TEXT | YES | LINEの表示名 |
| picture_url | TEXT | YES | プロフィール画像URL |
| first_seen_at | TIMESTAMPTZ | YES | 初回メッセージ日時 |
| last_seen_at | TIMESTAMPTZ | NO | 最終メッセージ日時 |

---

## 権限ロールについて

本システムには「ロール」と呼ぶ概念が2箇所に存在するため注意。

### ① staff.role（スタッフの職種）

`staff` テーブルの `role` カラム。スタッフの職種・役職を表す。

| 値 | 意味 |
|----|------|
| 経営者 | オーナー・経営者 |
| 管理者 | 全店舗管理者 |
| 店長 | 店舗責任者 |
| 副店長 | 店舗副責任者 |
| 従業員 | 一般スタッフ |
| 端末 | 店舗端末（device_codeが必須） |

### ② staff_store_assignments.role（アクセス権限）

`staff_store_assignments` テーブルの `role` カラム。システムへのアクセス範囲を制御する。

| レベル | 値 | 日本語 | アクセス範囲 |
|--------|-----|--------|-------------|
| 1 | staff | 一般従業員 | 配属店舗のみ |
| 2 | store_manager | 店舗管理者 | 配属店舗のみ |
| 3 | regional_manager | 全店管理者 | 全店舗 |
| 4 | system_admin | システム管理者 | 全店舗 + システム設定 |

regional_manager / system_admin は `store_id = NULL`（特定店舗に縛られない）。

---

## インデックス

主要なインデックス:

- `idx_staff_line_user_id` - LINE認証用
- `idx_sales_date` - 日別集計用
- `idx_sales_store` - 店舗別集計用
- `idx_attendance_staff_date` - 勤怠検索用
- `idx_products_store` - 店舗別商品取得用

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03 | 初版作成 |
| 2026-03 | sales/sale_items 分離、products追加、attendance追加 |
| 2026-03-24 | 認証系テーブルのカラム詳細追記、権限ロールの2種類を明確に分離して記載 |

# 設計上の考慮点・将来の課題

## 1. マルチテナント（複数店舗）対応

### 現在の実装（Phase 1）
- 店舗テーブルあり
- 従業員・顧客・売上に `store_id` を持たせる
- 店舗間の異動・応援は `staff_store_assignments` で管理

### 実装済み
- ✅ 店舗マスタ（`stores`）
- ✅ 従業員の店舗所属（`staff_store_assignments`）
- ✅ 顧客の店舗別履歴（`customer_store_history`）
- ✅ 売上の店舗紐付け（`sales.store_id`）

---

## 2. 複数 LINE ID 対応（未実装・将来の課題）

### 背景
- LINE User ID は変わることがある（アカウント削除→再登録）
- 1人が複数の LINE アカウントを持つケースがある
- 電話番号・メールアドレスも同様に変わる可能性がある

### 理想的な設計（保留）
```sql
-- Person マスタ（システム内の唯一の人物 ID）
persons (
  id UUID PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMP
)

-- LINE アカウント（1人が複数持てる）
line_accounts (
  id UUID PRIMARY KEY,
  person_id UUID REFERENCES persons(id),
  line_user_id TEXT UNIQUE,
  linked_at TIMESTAMP,
  unlinked_at TIMESTAMP,  -- NULL = 現在有効
  is_primary BOOLEAN
)
```

### 保留理由
- 実装が複雑すぎる
- 初回登録時の Person 特定が困難（重複リスク）
- 電話番号・メールも変わることを考慮すると更に複雑
- プロトタイプ段階では過剰設計

### 現在の対応
- **1人 = 1 LINE ID** として扱う
- LINE ID が変わった場合は**手動で対応**（新規登録扱い）
- 将来的に問題になったら再設計

---

## 3. 起きうる問題と対策

### 問題1: LINE ID 変更
**問題:** 顧客が LINE アカウントを削除→再登録した場合、過去の履歴が引き継がれない

**対策（現状）:**
- 店舗側で気づいたら、管理画面で手動で履歴を統合
- または新規顧客として扱う

**将来の対策:**
- Person マスタを導入
- 電話番号・名前でのマッチング機能

---

### 問題2: Person の重複
**問題:** 同じ人が複数の Person として登録される（名前の表記ゆれ、電話番号変更など）

**対策（現状）:**
- なし（発生したら手動統合）

**将来の対策:**
- 名寄せロジック（カナ名・電話番号でマッチング）
- Person 統合機能

---

### 問題3: プライバシー・データ削除要求
**問題:** GDPR などでデータ削除要求があった場合の対応

**対策（現状）:**
- 論理削除（`deleted_at` カラム）を検討
- 物理削除は外部キー制約で複雑

**将来の対策:**
- 削除リクエストテーブル
- 匿名化処理フロー

---

### 問題4: 複数店舗での売上二重計上
**問題:** 同じ売上が複数店舗で登録される

**対策（現状）:**
- 運用でカバー（登録時に確認）

**将来の対策:**
```sql
-- 重複チェック用インデックス
CREATE UNIQUE INDEX idx_sales_dedup 
  ON sales(date, customer_id, amount, item_name);
```

---

## 4. パフォーマンス考慮点

### JOIN の多用
- `persons` → `customers` → `customer_store_history` → `stores`
- クエリが遅くなる可能性

### 対策:
- インデックス最適化
- マテリアライズドビュー
- ページネーション必須

---

## 5. 権限管理

### 現在の想定
- 本部管理者：全店舗閲覧可能
- 店舗管理者：自店舗のみ
- 従業員：限定的な閲覧

### 実装方針
- Supabase の Row Level Security (RLS)
- `user_permissions` テーブルで管理

---

## 6. データ移行

### 既存データからの移行
現在の `line_users`, `admins` テーブルから新設計への移行が必要

### 移行スクリプト例
```sql
-- 既存データを新テーブルに移行
INSERT INTO persons (...)
SELECT ... FROM line_users;
```

---

## まとめ

### Phase 1（現在）
- ✅ 店舗の複数対応
- ✅ シンプルな設計（1人 = 1 LINE ID）

### Phase 2（将来）
- ⏰ Person マスタ導入
- ⏰ 複数 LINE ID 対応
- ⏰ 名寄せ・統合機能
- ⏰ GDPR 対応

---

**最終更新:** 2025-11-27
**作成者:** プロトタイプ開発チーム

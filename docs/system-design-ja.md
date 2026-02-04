# SSG ONE - システム設計書

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [モジュール間通信](#3-モジュール間通信)
4. [主要機能（Phase 1 - MVP）](#4-主要機能phase-1---mvp)
5. [データベーススキーマ](#5-データベーススキーマ)
6. [認証フロー](#6-認証フロー)
7. [将来のフェーズ](#7-将来のフェーズ)
8. [技術スタック](#8-技術スタック)

---

## 1. プロジェクト概要

### SSG ONE: マルチストア・ウェルネス事業管理システム

SSG ONEは、複数店舗を展開する日本のウェルネス事業（マッサージ、鍼灸、ボディケア）向けに設計された包括的な業務管理プラットフォームです。LINE Botとclaude AIを統合し、スタッフと顧客の両方にシームレスな体験を提供します。

### ビジネスコンテキスト

- **業種**: ウェルネス / セラピーサービス
- **ターゲット市場**: 日本国内の複数店舗展開ウェルネス事業者
- **初期展開**: 東京都内3店舗

### 店舗一覧

| 店舗名 | コード | 所在地 | 開店日 | ステータス |
|--------|--------|--------|--------|------------|
| 渋谷本店 | SBY001 | 東京都渋谷区 | 2020年4月 | 営業中 |
| 新宿店 | SJK001 | 東京都新宿区 | 2021年6月 | 営業中 |
| 池袋店 | IKB001 | 東京都豊島区 | 2023年3月 | 営業中 |

### 主要目標

1. **一元管理**: 複数店舗運営を単一ダッシュボードで管理
2. **LINE連携**: 日本市場向けネイティブ通信チャネル
3. **AI対応サポート**: Claude AIによる顧客問い合わせ・スタッフ支援
4. **ロールベースアクセス**: スタッフレベル別の詳細な権限管理
5. **マルチテナント構造**: 店舗間のセキュアなデータ分離

---

## 2. システムアーキテクチャ

### 全体アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            クライアント層                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────┐         ┌───────────────────┐                      │
│   │   Webブラウザ     │         │    LINEアプリ     │                      │
│   │  (管理画面)       │         │  (顧客/スタッフ)  │                      │
│   └─────────┬─────────┘         └─────────┬─────────┘                      │
│             │                             │                                 │
└─────────────┼─────────────────────────────┼─────────────────────────────────┘
              │                             │
              │ HTTPS                       │ HTTPS
              │                             │
┌─────────────┼─────────────────────────────┼─────────────────────────────────┐
│             ▼                             ▼        アプリケーション層       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────┐   ┌───────────────────────────┐            │
│   │      Next.js 14           │   │     LINEプラットフォーム  │            │
│   │      (Vercel)             │   │    Messaging API          │            │
│   │                           │   │                           │            │
│   │  ┌─────────────────────┐  │   └───────────┬───────────────┘            │
│   │  │  Reactコンポーネント│  │               │                            │
│   │  │  - ダッシュボード   │  │               │ Webhook                    │
│   │  │  - スタッフ管理     │  │               │                            │
│   │  │  - 顧客管理         │  │               ▼                            │
│   │  │  - 売上管理         │  │   ┌───────────────────────────┐            │
│   │  │  - 分析             │  │   │    AWS API Gateway        │            │
│   │  └─────────────────────┘  │   └───────────┬───────────────┘            │
│   │                           │               │                            │
│   │  ┌─────────────────────┐  │               ▼                            │
│   │  │    APIルート        │  │   ┌───────────────────────────┐            │
│   │  │  - /api/auth/*      │◄─┼───┤     AWS Lambda (Go)       │            │
│   │  │  - /api/send-line   │  │   │                           │            │
│   │  └─────────────────────┘  │   │  ┌─────────────────────┐  │            │
│   │                           │   │  │    ハンドラー       │  │            │
│   └───────────────────────────┘   │  │  - LINE Webhook     │  │            │
│                                   │  │  - 認証             │  │            │
│                                   │  │  - ブロードキャスト │  │            │
│                                   │  │  - プッシュ         │  │            │
│                                   │  └─────────────────────┘  │            │
│                                   │                           │            │
│                                   │  ┌─────────────────────┐  │            │
│                                   │  │    サービス         │  │            │
│                                   │  │  - LINEサービス     │  │            │
│                                   │  │  - Supabaseサービス │  │            │
│                                   │  │  - Claudeサービス   │  │            │
│                                   │  └─────────────────────┘  │            │
│                                   │                           │            │
│                                   └───────────────────────────┘            │
│                                               │                            │
└───────────────────────────────────────────────┼────────────────────────────┘
                                                │
                                                │ HTTPS
                                                │
┌───────────────────────────────────────────────┼────────────────────────────┐
│                                               ▼          データ層          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────┐       ┌───────────────────────────┐        │
│   │     Supabase              │       │     Claude API            │        │
│   │     (PostgreSQL)          │       │     (Anthropic)           │        │
│   │                           │       │                           │        │
│   │  ┌─────────────────────┐  │       │  - 自然言語処理           │        │
│   │  │  テーブル           │  │       │  - 顧客問い合わせ対応     │        │
│   │  │  - stores           │  │       │  - インテリジェント応答   │        │
│   │  │  - staff            │  │       │                           │        │
│   │  │  - staff_store_*    │  │       └───────────────────────────┘        │
│   │  │  - customers        │  │                                            │
│   │  │  - customer_store_* │  │                                            │
│   │  │  - sales            │  │                                            │
│   │  │  - magic_link_*     │  │                                            │
│   │  │  - admins           │  │                                            │
│   │  │  - line_users       │  │                                            │
│   │  └─────────────────────┘  │                                            │
│   │                           │                                            │
│   │  ┌─────────────────────┐  │                                            │
│   │  │  機能               │  │                                            │
│   │  │  - Row Level Sec.   │  │                                            │
│   │  │  - Auth (Supabase)  │  │                                            │
│   │  │  - Realtime         │  │                                            │
│   │  └─────────────────────┘  │                                            │
│   │                           │                                            │
│   └───────────────────────────┘                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### モジュール構成

```
ssg-one/
├── app/                           # Next.js 14 フロントエンド
│   ├── api/                       # APIルート
│   │   ├── auth/
│   │   │   ├── create-session/    # セッション管理
│   │   │   └── verify-magic/      # マジックリンク検証
│   │   └── send-line/             # LINEメッセージプロキシ
│   │
│   ├── admin/                     # 管理画面ページ
│   │   ├── dashboard/             # 店舗パフォーマンス概要
│   │   ├── staff/                 # スタッフ管理
│   │   ├── customers/             # 顧客管理
│   │   ├── sales/                 # 売上管理
│   │   ├── stores/                # 店舗管理
│   │   ├── analytics/             # 分析・レポート
│   │   ├── broadcast/             # LINE一斉送信
│   │   ├── users/                 # ユーザー管理
│   │   └── settings/              # システム設定
│   │
│   ├── auth/
│   │   └── magic/                 # マジックリンク着地ページ
│   │
│   ├── components/                # 共通コンポーネント
│   │   ├── AdminLayout.tsx        # 管理画面レイアウト
│   │   └── Navigation.tsx         # ナビゲーション
│   │
│   ├── login/                     # ログインページ
│   ├── signup/                    # 新規登録ページ
│   └── page.tsx                   # ホームページ
│
├── lib/                           # 共通ユーティリティ
│   ├── supabase.ts                # Supabaseクライアント
│   ├── auth-context.tsx           # 認証状態管理
│   └── fingerprint.ts             # デバイスフィンガープリント
│
├── backend-lambda/                # AWS Lambdaバックエンド (Go)
│   ├── main.go                    # Lambdaエントリーポイント・ルーター
│   │
│   ├── handlers/                  # リクエストハンドラー
│   │   ├── admin_handler.go       # 管理者操作
│   │   ├── auth_handler.go        # 認証
│   │   ├── broadcast_handler.go   # LINE一斉送信
│   │   ├── line_webhook.go        # LINE Webhook処理
│   │   └── push_handler.go        # プッシュ通知
│   │
│   ├── services/                  # ビジネスロジック
│   │   ├── claude_service.go      # Claude API連携
│   │   ├── line_service.go        # LINE API連携
│   │   └── supabase_service.go    # データベース操作
│   │
│   ├── models/                    # データモデル
│   └── utils/                     # ユーティリティ
│
├── scripts/                       # データベーススクリプト
│   ├── schema-multistore.sql      # データベーススキーマ
│   ├── seed-multistore.sql        # 店舗・スタッフデータ
│   ├── seed-multistore-customers.sql
│   ├── seed-multistore-sales.sql
│   └── migration-add-roles.sql    # ロールマイグレーション
│
└── docs/                          # ドキュメント
    ├── system-design.md           # システム設計書（英語）
    ├── system-design-ja.md        # 本ドキュメント
    └── design-considerations.md   # 将来の検討事項
```

---

## 3. モジュール間通信

### 通信パターン

#### 3.1 APIゲートウェイパターン

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ クライアント │─────▶│ APIゲート   │─────▶│   Lambda    │
│ (ブラウザ/  │      │  ウェイ     │      │   (Go)      │
│  LINEアプリ)│◀─────│  (AWS)      │◀─────│             │
└─────────────┘      └─────────────┘      └─────────────┘
```

**ルーティング:**
| パス | メソッド | ハンドラー | 説明 |
|------|----------|------------|------|
| `/line-webhook` | POST | LINEWebhookHandler | LINEメッセージイベント |
| `/send-line` | POST | BroadcastHandler | 一斉送信 |
| `/broadcast` | POST | BroadcastHandler | 一斉送信（エイリアス） |
| `/send-push` | POST | PushHandler | 特定ユーザーへのプッシュ |
| `/verify-magic` | POST | AuthHandler | マジックリンク検証 |

#### 3.2 LINE Webhookフロー

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ ユーザー │────▶│   LINE   │────▶│  Lambda  │────▶│ Supabase │────▶│  Claude  │
│(LINEアプリ)    │プラット  │     │          │     │          │     │   API    │
└──────────┘     │フォーム  │     └──────────┘     └──────────┘     └──────────┘
     ▲          └──────────┘            │                                 │
     │                                  │                                 │
     └──────────────────────────────────┴─────────────────────────────────┘
                              LINE Reply APIで返信
```

**メッセージフロー:**
1. ユーザーがLINEでメッセージ送信
2. LINEプラットフォームがLambdaにWebhook送信
3. Lambdaがイベントを解析してユーザーを特定
4. ユーザープロファイルをSupabaseに登録/更新
5. メッセージをルーティング:
   - 「管理画面」→ 管理者マジックリンクフロー
   - その他 → Claude AIが応答生成
6. LINE Reply APIで返信

#### 3.3 マジックリンク認証フロー

```
┌─────────────────────────────────────────────────────────────────────┐
│                      マジックリンク認証                              │
└─────────────────────────────────────────────────────────────────────┘

ステップ1: マジックリンクのリクエスト
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ ユーザー │────▶│   LINE   │────▶│  Lambda  │────▶│ Supabase │
│「管理画面」    │ Webhook  │     │ Admin    │     │ トークン │
└──────────┘     └──────────┘     │ Handler  │     │ 保存     │
     ▲                            └──────────┘     └──────────┘
     │                                  │
     └──────────────────────────────────┘
         マジックリンク + 2FAコードをLINEで送信

ステップ2: マジックリンクの検証
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ブラウザ  │────▶│ Next.js  │────▶│  Lambda  │────▶│ Supabase │
│リンク    │     │ /auth/   │     │ Auth     │     │ トークン │
│クリック  │     │ magic    │     │ Handler  │     │ 検証     │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                                  │
     │                                  │
     ▼                                  │
┌──────────┐                            │
│  2FA     │◀───────────────────────────┘
│  必要    │        (新しいデバイスの場合)
└──────────┘
```

#### 3.4 フロントエンド・バックエンド間通信

```typescript
// Next.js APIルート → Lambda
const apiUrl = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/endpoint`
  : '/api/endpoint';  // ローカル開発時のフォールバック
```

**環境設定:**
- **ローカル開発**: Next.js APIルート → Supabase直接接続
- **本番環境**: Next.js APIルート → Lambda → Supabase

---

## 4. 主要機能（Phase 1 - MVP）

### 4.1 管理ダッシュボード

**目的**: 全店舗のビジネスパフォーマンスを一元表示

**コンポーネント:**
- **サマリーカード**: 総顧客数、売上件数、総売上額
- **店舗パフォーマンス**: 月次目標に対する進捗（店舗別）
- **最近の売上**: 全店舗の最新取引
- **月選択**: 過去データの閲覧

**主要指標:**
- 店舗別売上（実績 vs 目標）
- 取引件数
- 達成率（色分け表示）

### 4.2 スタッフ管理

**機能:**
- ロールバッジ付きスタッフ一覧
- 所属店舗と現在の配属状況
- 配属履歴（異動、応援）
- 複数店舗スタッフの追跡

**ロール階層:**
| ロール | レベル | 表示名 | アクセス範囲 |
|--------|--------|--------|--------------|
| staff | 1 | 一般従業員 | 配属店舗のみ |
| store_manager | 2 | 店舗管理者 | 配属店舗のみ |
| regional_manager | 3 | 全店管理者 | 全店舗 |
| system_admin | 4 | システム管理者 | 全店舗 + システム |

### 4.3 顧客管理

**機能:**
- タイプ分類付き顧客一覧
- 複数店舗来店履歴
- 生涯価値（LTV）追跡
- 顧客セグメンテーション

**顧客タイプ:**
| タイプ | 条件 | 人数 |
|--------|------|------|
| VIP | 高額支出、複数店舗利用 | 5名 |
| multi-store | 2店舗以上利用 | 20名 |
| regular | 単一店舗に継続来店 | 30名 |
| new | 最近初来店 | 10名 |

### 4.4 売上管理

**機能:**
- 取引記録
- 商品タイプ分類
- 支払方法追跡
- スタッフ紐付け

**商品タイプ:**
- 施術: マッサージ、鍼灸、ボディケア
- 物販: 商品、サプリメント
- 回数券: プリペイドサービスパッケージ

**支払方法:**
- 現金
- カード（クレジットカード）
- QRコード決済
- 回数券

### 4.5 LINE Bot連携

**機能:**
- **顧客問い合わせ**: Claude AIによる自然言語応答
- **管理者アクセス**: 「管理画面」キーワードでマジックリンク発行
- **一斉送信**: LINE友だち全員へのメッセージ送信
- **プッシュ**: 特定ユーザーへの送信

**メッセージルーティング:**
```go
if strings.TrimSpace(userMessage) == "管理画面" {
    replyMessage = h.adminHandler.HandleAdminRequest(userID)
} else {
    replyMessage = h.handleClaudeMessage(userMessage)
}
```

---

## 5. データベーススキーマ

### ER図

```
                                    ┌─────────────────┐
                                    │     stores      │
                                    │     (店舗)      │
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
│       (従業員)          │    │        (顧客)           │    │        (売上)           │
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
│    (配属履歴)           │    │   (来店履歴)            │
├─────────────────────────┤    ├─────────────────────────┤
│ id (PK)                 │    │ id (PK)                 │
│ staff_id (FK)           │    │ customer_id (FK)        │
│ store_id (FK) *NULL可   │    │ store_id (FK)           │
│ assignment_type         │    │ first_visit             │
│ role                    │    │ last_visit              │
│ start_date              │    │ visit_count             │
│ end_date                │    │ total_spent             │
└─────────────────────────┘    └─────────────────────────┘

* store_idはregional_managerとsystem_adminロールの場合NULL
```

### 主要テーブル

#### stores（店舗マスタ）
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

#### staff_store_assignments（ロールベースアクセス）
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

  -- 制約: regional/systemロールの場合はstore_idがNULLでなければならない
  CONSTRAINT check_role_store_combination CHECK (
    (role IN ('regional_manager', 'system_admin') AND store_id IS NULL) OR
    (role IN ('staff', 'store_manager') AND store_id IS NOT NULL)
  )
);
```

### 参考ドキュメント

スキーマの詳細については以下を参照:
- [`scripts/schema-multistore.sql`](../scripts/schema-multistore.sql)
- [`scripts/README-multistore.md`](../scripts/README-multistore.md)

---

## 6. 認証フロー

### 概要

SSG ONEはパスワードレス認証システムを採用:
1. **マジックリンク**: LINEで送信されるワンタイムURL
2. **2段階認証**: 新しいデバイスでの確認コード
3. **デバイスフィンガープリント**: 既知デバイスの信頼

### 詳細フロー

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            認証フロー                                        │
└─────────────────────────────────────────────────────────────────────────────┘

1. ユーザーがアクセスをリクエスト
   ┌──────────┐                    ┌──────────┐
   │ ユーザー │   「管理画面」     │   LINE   │
   │  (LINE)  │ ─────────────────▶│  サーバー│
   └──────────┘                    └────┬─────┘
                                        │
                                        ▼
2. トークン生成                    ┌──────────┐
                                   │  Lambda  │
   - ユニークトークン生成          │  Admin   │
   - 6桁の2FAコード生成            │ Handler  │
   - magic_link_tokensに保存       └────┬─────┘
   - 有効期限15分を設定                 │
                                        ▼
3. マジックリンク送信              ┌──────────┐
   ┌──────────┐                    │ Supabase │
   │ ユーザー │ ◀── マジックリンク│ + LINE   │
   │  (LINE)  │     + 2FAコード   │  Reply   │
   └──────────┘                    └──────────┘

4. ユーザーがリンクをクリック
   ┌──────────┐                    ┌──────────┐
   │ ブラウザ │ ───────────────────▶│ Next.js  │
   │          │    /auth/magic     │ /auth/   │
   │          │    ?token=xxx      │ magic    │
   └──────────┘                    └────┬─────┘
                                        │
5. トークン検証                         ▼
                                   ┌──────────┐
   - トークンの存在確認            │  Lambda  │
   - 有効期限チェック              │   Auth   │
   - 使用済みかチェック            │ Handler  │
   - デバイスフィンガープリント比較└────┬─────┘
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
           ┌──────────────┐                        ┌──────────────┐
           │ 同一デバイス │                        │ 新しいデバイス│
           │              │                        │              │
           │ 2FAスキップ  │                        │ 2FA必要      │
           │ アクセス許可 │                        │ コード入力   │
           └──────────────┘                        └──────┬───────┘
                                                          │
                                                          ▼
                                                  ┌──────────────┐
                                                  │ 2FA検証      │
                                                  │              │
                                                  │ - コード確認 │
                                                  │ - 許可/拒否  │
                                                  └──────────────┘

6. セッション作成
   - トークンを使用済みにマーク
   - Supabaseセッション作成
   - ダッシュボードへリダイレクト
```

### セキュリティ機能

| 機能 | 実装 |
|------|------|
| トークン有効期限 | 15分 |
| 使い捨て | 検証後にトークンを使用済みにマーク |
| 2FAコード | 6桁数字、LINEで送信 |
| デバイス信頼 | LINE User IDをフィンガープリントとして使用 |
| レート制限 | API Gatewayで処理 |

### トークンストレージ

```sql
-- magic_link_tokensテーブル（簡略化）
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

## 7. 将来のフェーズ

### Phase 2: 運営機能強化

| 機能 | 説明 | 優先度 |
|------|------|--------|
| ミーティング文字起こし | スタッフミーティングの音声テキスト化 | 高 |
| メンタルヘルス追跡 | スタッフのウェルネスモニタリング | 中 |
| 予約スケジューリング | オンライン予約システム | 高 |
| 在庫管理 | 店舗間の在庫追跡 | 中 |
| スタッフ資格管理 | 資格・認定の追跡 | 低 |

### Phase 3: 顧客体験

| 機能 | 説明 | 優先度 |
|------|------|--------|
| 顧客予約 | LINEベースの予約 | 高 |
| 決済連携 | オンライン決済処理 | 高 |
| ロイヤルティプログラム | ポイント・特典システム | 中 |
| 顧客ポータル | セルフサービスアカウント管理 | 中 |
| レビューシステム | サービスフィードバック収集 | 低 |

### 技術的改善

| 領域 | 改善内容 |
|------|----------|
| パフォーマンス | 分析用マテリアライズドビュー |
| スケーラビリティ | 日付によるデータベースパーティショニング |
| セキュリティ | RLSポリシーの強化 |
| モニタリング | アプリケーションパフォーマンス監視 |
| テスト | E2Eテストカバレッジ |

### 保留中の設計判断

詳細は [`docs/design-considerations.md`](./design-considerations.md) を参照:
- 1人に対する複数LINE IDのサポート
- Person重複排除（名寄せ）
- GDPR準拠機能
- 複雑な権限階層

---

## 8. 技術スタック

### フロントエンド

| 技術 | バージョン | 用途 |
|------|------------|------|
| Next.js | 14.x | App Router搭載Reactフレームワーク |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 3.x | ユーティリティファーストスタイリング |
| React | 18.x | UIコンポーネントライブラリ |

### バックエンド

| 技術 | バージョン | 用途 |
|------|------------|------|
| Go | 1.21+ | Lambda関数言語 |
| AWS Lambda | - | サーバーレスコンピュート |
| AWS API Gateway | V2 | HTTP APIルーティング |

### データベース

| 技術 | バージョン | 用途 |
|------|------------|------|
| Supabase | - | PostgreSQL as a Service |
| PostgreSQL | 15.x | プライマリデータベース |
| Row Level Security | - | マルチテナントデータ分離 |

### 外部サービス

| サービス | 用途 |
|----------|------|
| Claude API (Anthropic) | AI駆動の応答 |
| LINE Messaging API | 顧客/スタッフコミュニケーション |
| LINE Login | OAuth認証 |

### デプロイメント

| コンポーネント | プラットフォーム | リージョン |
|----------------|------------------|------------|
| フロントエンド | Vercel | 自動（エッジ） |
| バックエンド | AWS Lambda | ap-northeast-1 |
| データベース | Supabase | ap-northeast-1 |

### 開発ツール

| ツール | 用途 |
|--------|------|
| Git | バージョン管理 |
| npm | パッケージ管理 |
| ESLint | コードリンティング |
| Prettier | コードフォーマット |

---

## ドキュメント履歴

| バージョン | 日付 | 作成者 | 変更内容 |
|------------|------|--------|----------|
| 1.0 | 2025-02-04 | SSG ONEチーム | 初版システム設計書 |

---

## 参考資料

- [Next.js ドキュメント](https://nextjs.org/docs)
- [Supabase ドキュメント](https://supabase.com/docs)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [Claude API ドキュメント](https://docs.anthropic.com/)
- [AWS Lambda Go](https://docs.aws.amazon.com/ja_jp/lambda/latest/dg/golang-handler.html)

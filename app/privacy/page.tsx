'use client';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">プライバシーポリシー</h1>

        <div className="space-y-6 text-gray-700">
          <section>
            <h2 className="text-lg font-semibold mb-2">1. 収集する情報</h2>
            <p>本サービスでは、以下の情報を収集します：</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>LINEユーザーID、表示名、プロフィール画像</li>
              <li>売上・取引に関する情報</li>
              <li>サービス利用履歴</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">2. 情報の利用目的</h2>
            <p>収集した情報は以下の目的で利用します：</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>本サービスの提供・運営</li>
              <li>ユーザー認証</li>
              <li>サービス改善</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">3. 第三者提供</h2>
            <p>法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">4. 情報の管理</h2>
            <p>収集した情報は適切なセキュリティ対策を講じて管理します。</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">5. お問い合わせ</h2>
            <p>プライバシーに関するお問い合わせは、LINEにてご連絡ください。</p>
          </section>

          <p className="text-sm text-gray-500 mt-8">
            制定日: 2024年11月1日<br />
            最終更新: 2024年11月1日
          </p>
        </div>
      </div>
    </main>
  );
}

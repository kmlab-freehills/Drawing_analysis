# 図面 表面積・自動解析 (Next.js)

## セットアップ

1) 依存関係をインストール
```bash
npm install
```

2) `.env.local` を作成（`.env.local.example` をコピー）
```bash
cp .env.local.example .env.local
```
`GEMINI_API_KEY` を設定してください。

3) 開発サーバ起動
```bash
npm run dev
```

## 使い方

- 画面の「図面を選択して解析する」ボタンを押す
- PDFまたは画像を選ぶと、自動で `/api/analyze` に送信され解析します
- 結果が表示されます

## 注意

- `app/api/analyze/route.ts` はファイルを一時保存するため **Node.js runtime** で動かしています。

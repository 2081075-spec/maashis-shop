# MAASHI's SHOP — 運用ガイド

## 公開URL（これが正式なURLです）

- **お店のページ**: https://maashis-shop.pages.dev/
- **管理画面（非公開・在庫調整用）**: https://maashis-shop.pages.dev/admin.html

以前あった `https://2081075-spec.github.io/maashis-shop/` は公開を停止しました（重複防止のため）。

## 構成

| 役割 | サービス | 備考 |
|---|---|---|
| 実際の公開・ホスティング | **Cloudflare Pages**（無料） | プロジェクト名 `maashis-shop` |
| ソースコードの保管・履歴 | **GitHub**（無料） | https://github.com/2081075-spec/maashis-shop 。Pagesとしての公開は停止済み、バックアップ用 |

| ファイル | 役割 |
|---|---|
| `index.html` | お客様が見るページ本体（商品データを内蔵） |
| `stock.json` | 価格・在庫・非表示だけを上書きする小さなファイル |
| `admin.html` / `admin.js` | 在庫・価格を編集して `stock.json` を作る非公開の管理ツール |

---

## 1日2回の更新（現在の運用フロー）

商品数や商品自体が入れ替わる「フルカタログの再書き出し」がベースの更新方法になっています。

1. 最新のカタログ書き出しファイル（例: `maashis-shop-catalog (N).html`）をこの `AIno` フォルダに置く
2. Claude Code（このチャット）に「更新して」と伝える
3. Claude Codeが以下を自動実行します
   - `index.html` を新しい内容に差し替え
   - GitHubへコミット・push（履歴保存）
   - Cloudflare Pagesへデプロイ（`wrangler pages deploy`）
4. 数十秒〜1分程度で https://maashis-shop.pages.dev/ に反映されます

## 在庫だけの細かい調整をしたいとき（admin.html）

新商品の入れ替えを伴わない、価格・在庫・売り切れ表示だけの微調整であれば `admin.html` が使えます。

1. https://maashis-shop.pages.dev/admin.html を開く
2. 対象商品を検索し、価格・在庫を編集／売り切れなら「非表示」にチェック
3. 「stock.jsonをダウンロード」を押す
4. ダウンロードした `stock.json` をClaude Codeに渡す（またはこのフォルダに置いて伝える）→ Claude Codeが反映

※ `stock.json` の反映も、現状はCloudflareへのデプロイ操作（Wrangler CLI）が必要なため、
　最終的な公開までは今のところClaude Code経由になります。GitHubのブラウザ操作だけで
　完結していた以前の形に戻したい場合は、Cloudflare PagesとGitHubリポジトリを直接連携（Git連携）
　させることで「GitHub上でファイルを上書き→自動で公開まで反映」という完全ブラウザ完結の運用に
　変更することも可能です。希望があれば設定します。

---

## 新商品の追加・削除について

商品そのもののリスト（名前・画像・シリーズなど）は `index.html` の中に直接埋め込まれています。
フルカタログの再書き出しファイルをそのまま差し替える運用であれば、新商品の追加・削除もこの
「1日2回の更新」フローの中で自動的に反映されます（`stock.json` だけでは新商品の追加はできません）。

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
| 商品データの仕入元 | **shinsoku-tcg.com/b2b**（ログイン制） | Claude Code単体ではログイン後の画面を読み取れないため、Claude for Chrome拡張機能で読み取る |

| ファイル | 役割 |
|---|---|
| `index.html` | お客様が見るページ本体（商品データ・デザイン一式を内蔵） |
| `stock.json` | 価格・在庫・非表示・最終更新日時だけを上書きする小さなファイル |
| `admin.html` / `admin.js` | 在庫・価格を編集して `stock.json` を作る非公開の管理ツール |

---

## 1日2回の更新（現在の運用フロー）

商品数や商品自体が入れ替わるため、「shinsoku-tcg.com/b2bからJSONを書き出し→Claude Codeが取り込む」方式です。

1. Chrome拡張機能「Claude for Chrome」で、ログイン済みのブラウザから下記プロンプトを実行し、
   `shinsoku-import.json` を書き出す
2. できたファイルをこの `AIno` フォルダに置く（同名ファイルがあれば `(1)` のように自動採番されるが、
   最新のものを自動で拾うので問題ない）
3. Claude Code（このチャット）に「更新して」と伝える
4. Claude Codeが以下を自動実行します
   - JSONを検証（件数・欠損・重複・想定外の商品種別のチェック）
   - サイトの商品データ形式に変換（`PSA→PSA10`、既知の表記ゆれ `AM→A-` の自動修正など）
   - `index.html` 内の商品データだけを差し替え（デザイン部分は一切変更されない）
   - GitHubへコミット・push（履歴保存）
   - Cloudflare Pagesへデプロイ（`wrangler pages deploy`）
5. 数十秒〜1分程度で https://maashis-shop.pages.dev/ に反映されます

### Chrome拡張機能に貼り付けるプロンプト（そのままコピペ可）

```text
https://shinsoku-tcg.com/b2b/products?title=ポケモン と
https://shinsoku-tcg.com/b2b/products?title=ワンピース を、
それぞれページネーションで最後のページまで巡回し、表示されているすべての商品について、
以下の項目を読み取ってください。

- name: 商品の日本語名
- nameEn: 商品の英語名（表示があれば。なければ空文字でよい）
- item_id: 商品コード・型番（例: IAP2600004217のような表記）
- code: カードに割り当てられている番号（ポケモンは「015/025」のような形式、
  ワンピースは「OP09-112」のような形式。表示があれば正確に。なければ空文字でよい）
- type: "PSA"（鑑定済みシングルカード）または "BOX"（未開封BOX等）のどちらか
- series: 検索対象に応じて "ポケモン" または "ワンピース"
- img: 商品画像のURL
- ranks: 価格・在庫のランクごとの配列。各要素は
  - cond: ランク名（S, A-, A, B など、ページ上の表記そのまま）
  - price: 価格（数値のみ）
  - stock: 在庫数（数値のみ）

全商品を1件も省略せず、以下のようなJSON配列としてまとめ、
ファイル名 shinsoku-import.json として保存してください。

[
  {
    "name": "商品の日本語名",
    "nameEn": "商品の英語名",
    "item_id": "IAP2600004217",
    "code": "015/025",
    "type": "PSA",
    "series": "ポケモン",
    "img": "https://...",
    "ranks": [
      {"cond": "S", "price": 4800, "stock": 3628}
    ]
  }
]

件数が多いので、途中経過（現在何件読み取ったか）を都度教えてもらえると助かります。
```

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

## サイトの機能

- 名前・型番・カード番号（`code`）・シリーズでの検索
- 種別（鑑定品/未開封BOX）・シリーズでの絞り込み
- 価格の高い順・安い順の並び替え
- 在庫・価格は `stock.json` 経由で1日2回更新、最終更新日時も自動表示

## 既知の注意点

- shinsoku-tcg.com側の表記ゆれで、コンディション「A-」が「AM」として読み取られることがある
  （バッジのCSSは `A-` にしか対応していないため、そのまま反映すると表示が崩れる）。
  Claude Code側の変換処理で自動的に `AM→A-` に補正している。
- `PSA`/`BOX` 以外の種別（例: 未鑑定シングルなど）が混ざっていた場合は、サイト側に
  対応するタグ・フィルターが無いため、都度Claude Codeが確認を挟む運用にしている。

## 新商品の追加・削除について

商品そのもののリスト（名前・画像・シリーズなど）は `index.html` の中に直接埋め込まれています。
上記のJSON取り込みフローであれば、新商品の追加・削除もこの「1日2回の更新」の中で自動的に
反映されます（`stock.json` だけでは新商品の追加はできません）。

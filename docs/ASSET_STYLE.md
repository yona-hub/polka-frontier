# POLKA FRONTIER アセット制作規約 / 2026-11-21

## 採用済みの方向
- アイテムアイコンは**ピクセル絵ではない**。2026-11-20のユーザー添付にある、暗い青緑の鉱石、紫水晶、青緑・紫の群晶を参照した、輪郭明瞭な手描き/ペインターリー調のファンタジーアイコン。
- 立体世界の雰囲気はTree of Saviorに近い柔らかな絵画調2.5Dを参考とするが、**原作/既存ゲームの固有デザインをコピーしない**。
- 3Dで床・壁・建物などの空間を作り、見た目は後から磨く。キャラは3D原型から2Dスプライトへ変換する手法も候補で、正式な画面方式はPoCで決定。
- アイテム1,000種類超に備え、基本アート300〜500点（目標値）+形状・材質・色・装飾のシリーズ差分を生成。アイテムIDと画像IDは分離。
- 仮のグレー3Dモデルは**正式なキャラ造形ではない**。

## アイコンの共通スタイル
- 3/4角度、単品、中央、輪郭は明確、影はアイテム自体のみ。
- 透明背景PNGの原画を作成、48/64pxへ縮小したときの読みやすさを検査。
- 比較的大きな面分割の陰影、材質の違い（岩/金属/結晶）のわかりやすい塗り。
- 不要な文字/数字/背景/枠/透かし/余計な物体/無断引用デザインを禁止。
- スタイルマスター参考画像 `assets/reference/item_style_2026-11-20.png` はCodex ZIPのローカル版にのみ保存。GitHubへの公開は許諾確認後。

## アイコン生成プロンプト（再利用版）

```text
You are creating an original inventory item icon for a commercial fantasy browser MMORPG.

ITEM
ID: {item_id}
Category: {category}
Name: {item_name}
Visual description: {visual_description}
Material: {material}
Main colors: {colors}
Distinctive feature: {distinctive_feature}

STYLE
- Follow the attached APPROVED STYLE MASTER image.
- Keep the same illustration technique, perspective,
  lighting direction, outline weight and detail density.
- Single item only, centered.
- Clear, recognizable silhouette.
- Consistent three-quarter item presentation.
- Readable when displayed at 48x48 or 64x64 pixels.
- Crisp silhouette and clean material separation.
- Transparent background.
- No text, labels, numbers, borders, frames or watermarks.
- No background environment or checkerboard.
- Do not imitate any existing game's item design.

OUTPUT
One isolated item icon.
Preserve the chosen item's identity.
Do not add unrelated ornaments or objects.
```

## バッチ生成の規約
1. アイテムマスターから同系統を抽出。アイテムごとにIDと画像IDを固定する。
2. 基本形の少数を生成して人間が画風/陰影/形状を承認する。
3. 承認済みのマスターを基に10〜50点の派生候補を作る。プロンプト/モデル/作成日時/費用/画像参照元の記録を残す。
4. 画像のアルファ、余白、重複、解像度、配色、視認性を検査。48/64pxのコンタクトシートを作り人が採否判断する。
5. 承認後のみatlas/WebP/metadataへビルド。未承認の生成画像はゲーム内で使わない。

## Codex Skills（今は実装せず、アセット制作を始めるときに作成）
- `mmorpg-item-designer` — アイテムのゲームデータ定義、ID、分類、重量、装備/ドロップ/発掘。
- `mmorpg-asset-factory` — 共通参照から一括生成、派生、履歴、アトラス出力。
- `mmorpg-asset-qa` — 透過/余白/サイズ/重複/識別性の検査と差戻し。
- `mmorpg-content-balancer` — 12能力・4BPの戦闘、レア率/装備品質/重量/通貨のテスト。

## ツール台帳（候補）
- Blender + Python: 3D構造/キャラ/建築/8方向スプライトのレンダリングと検証。
- [HardRockTech 3D→2D](https://github.com/HardRockTech/3d-to-2d-sprite-pipeline) (MIT) および [barissabuncular pipeline](https://github.com/barissabuncular/game-asset-pipeline) (MIT): 制作工程・QAの技術参考（そのまま本番投入しない）。
- PixelLab / Pixelorama: ドット絵の場面では候補。ただし現在の非ドット絵アイコンには第一候補でない。
- GPT Imageなど手描き表現に向く画像生成モデル + Pillow/Sharp/atlas処理を検証。
- LDtk/Tiled: 2D構造データ、必要に応じてゲーム内オブジェクトの管理。

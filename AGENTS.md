# AGENTS.md — 器ライティングシミュレーター

## 1. 役割とペルソナ

このプロジェクトは「器ライティングシミュレーター」——飲食店メニュー撮影のライティングを、現地に行く前にThree.js上で事前に検証するための**社内向けプロトタイプツール**です。

品質の方向性は**MVP思考**です。無料・社内利用のプロトタイプなので、まず一通り動作する骨格を最優先してください。細部の磨き込みは後工程（Antigravityでの仕上げ）で行います。ただし、ライティング計算ロジック（逆二乗則・ストロボ実機換算）の正確性だけは妥協しないでください。ここが不正確だと、ツールとして意味がなくなります。

## 2. 技術スタック

- **フロントエンド**：Vanilla HTML / CSS / JavaScript（フレームワークなし、ビルドツールなし、npmビルド不要）
- **3Dライブラリ**：Three.js **r0.185.0固定**。CDN経由のESM importmapで読み込むこと。
  ```html
  <script type="importmap">
  {
    "imports": {
      "three": "https://unpkg.com/three@0.185.0/build/three.module.js",
      "three/addons/": "https://unpkg.com/three@0.185.0/examples/jsm/"
    }
  }
  </script>
  ```
  **異なるバージョンや異なるCDNへの変更は禁止**。バージョンが曖昧だと古いAPIを使ってしまうため、必ず上記バージョンに固定してください。
- **使用するThree.js addon**：
  - `USDLoader`（usdz読み込み）／ `GLTFLoader`（glbフォールバック）
  - `RectAreaLightUniformsLib`（RectAreaLight使用に必須の初期化）
  - `TransformControls`（3Dビューポート内でのライトのドラッグ操作）
  - `EffectComposer` / `ShaderPass`（白飛びゼブラ表示のポストプロセス）
- **ホスティング**：Vercel（静的サイトとしてデプロイ）
- **データ保存**：`localStorage`のみ。バックエンド・DB・認証は一切不要

## 3. ファイル構成

```
repo/
├── AGENTS.md
├── references/
│   └── skills/
│       └── design.md          ← デザイン・技術方針（変更禁止）
├── index.html
├── style.css
└── src/
    ├── main.js                ← エントリーポイント、初期化の統括
    ├── scene-setup.js         ← Three.jsシーン・カメラ・レンダラー初期化
    ├── model-loader.js        ← usdz/glb読み込み、失敗時フォールバック処理
    ├── lighting.js            ← メインライト・サブライト・レフ板（RectAreaLight）管理
    ├── strobe-calc.js         ← GN・逆二乗則・実機出力換算ロジック
    ├── strobe-profiles.js     ← ストロボ機種プロファイルデータ（TT350S等）
    ├── zebra-overlay.js       ← 白飛び可視化（ポストプロセスシェーダー）
    ├── drag-controls.js       ← TransformControlsによるライトの3Dドラッグ操作
    ├── ui-controls.js         ← スライダー・ダイヤル・サイドパネルのDOM操作
    └── presets.js             ← localStorage保存・読み込み・スクリーンショット取得
```

各ファイルは空のスタブ（最小限のexport定義のみ）を用意してあります。実装時にこの役割分担を崩さないでください。

## 4. 厳格なルール

- Three.jsのバージョン・CDNは固定すること（上記2章参照）。異なるバージョンへの変更禁止
- `RectAreaLight`はThree.jsの仕様上、影を落とせません。シャドウマップ実装を試みず、仕様書記載の簡易近似で妥協してください
- ストロボ出力換算ロジック（`strobe-calc.js`）は以下の計算式に厳密に従うこと。独自の近似式に置き換えないでください：
  ```
  必要GN = 被写体までの距離(m) × 想定F値
  出力パワー比 = (必要GN ÷ 機種のフル出力時GN)²
  → ソフトボックス透過減衰分を加味して補正
  → 最も近い出力段（1/1〜1/128、1/3段刻み）に丸めて提案
  ```
- `localStorage`のデータ構造は、Issue仕様書に記載のJSON構造に従うこと。フィールド名を勝手に変更しないでください
- `references/skills/design.md`の内容（カラーコード・数値等）は変更しないこと。デザイン方針は固定です
- 新規プロジェクトのため、既存ファイルの変更禁止指定はありません

## 5. referencesの読み込み

作業開始前に、以下を**必ず**読み込んでください：

- `references/skills/design.md`（デザイン・技術方針）

## 6. Critic Agent向け品質チェックリスト

PRを出す前に、以下を自己チェックしてください：

- [ ] Three.jsのバージョンが`r0.185.0`に固定されているか（importmapの記述を確認）
- [ ] メインライト・サブライト・レフ板が、それぞれ独立してON/OFF切り替え・パラメータ調整できるか
- [ ] 距離パラメータの変更時、逆二乗則で光量が自動的に再計算されているか
- [ ] ソフトボックスサイズ変更時、`RectAreaLight`のwidth/heightが連動して変化し、見た目の柔らかさが変わるか
- [ ] 白飛び可視化のON/OFFトグルが正しく機能しているか
- [ ] プリセット保存時、パラメータと同時に画面スクリーンショットも保存されているか
- [ ] ストロボ実機換算が1/3段刻みで、最も近い出力値を正しく提案しているか
- [ ] usdzモデルの読み込みに失敗した場合、glbへのフォールバックとエラーメッセージ表示が機能するか
- [ ] 器モデルを切り替えても、既存のライティング設定パラメータが破綻しないか

# Programo

**Programo** は、階層型のアウトライナーとグラフビューを組み合わせたデスクトップアプリです。  
Markdown 的な感覚でアウトラインを編集し、同時にノード間のつながりをグラフとして視覚化できます。  
学習・研究・設計メモ・小説の構想など、アイデア整理に最適です。

---

## ✨ 特徴

- **アウトラインエディタ**
  - Enter で兄弟ノードを追加
  - Tab / Shift+Tab でインデント調整（階層変更）
  - Backspace で空行を削除（最低1つは残る）
  - ↑↓キーで上下ノードにカーソル移動

- **リンク補完**
  - `[[` と入力すると既存ノードを候補から補完
  - 候補を選んで Enter で確定
  - 自動でリンクがグラフに反映される

- **グラフビュー**
  - 同階層（兄弟ノード）を直線で結ぶ
  - 親 → 最初の子だけを結ぶ
  - `[[リンク]]` はオレンジ線で表現
  - シンプルなノード＆線のみ（矢印なし）

- **Electron デスクトップアプリ**
  - Windows / macOS / Linux 向けにビルド可能
  - データはローカル保存（`electron-store`）

---

## 📦 インストール

リポジトリを clone してください：

git clone https://github.com/ユーザー名/programo.git
cd programo
依存関係をインストール：

npm install
🚀 開発モードで実行
npm run electron:dev
React (CRA) が http://localhost:3000 で立ち上がり

Electron ウィンドウからアプリを操作できます

🛠️ ビルド
プラットフォームごとにパッケージを作成します：

npm run electron:build
Windows: dist/win-unpacked/ または dist/Programo Setup.exe

macOS: dist/*.dmg

Linux: dist/*.AppImage

📂 プロジェクト構成
frontend/
  ├── src/              # React フロントエンド
  │   ├── components/   # UI コンポーネント
  │   ├── store/        # Zustand ストア
  │   └── lib/          # 補助関数
  ├── electron/         # Electron メインプロセス
  ├── build/            # アイコンなどリソース
  └── package.json

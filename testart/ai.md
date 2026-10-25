# テスタート AI 連携の手順書（AI エージェント向け）

テスタートは、個人開発者どうしが Google Play のクローズドテスト（12 人 × 14 日）に参加しあい、不具合・レビュー・要望を送りあう Android アプリです。
この文書は、Claude Code などの AI が、利用者本人の代わりにテスタートを操作するための手順です。

## 大事なこと

- 利用者から **トークン**（`tsa_` で始まる文字列）を受け取って使います。トークンは本人専用の合言葉です。
  - ファイル・コミット・ログ・公開する場所に書かないでください。会話の中だけで使います。
  - 繰り返し使うなら、環境変数（例：`TESTART_TOKEN`）に入れてもらうのがおすすめです。
- 登録・募集開始・感想の送信は、**利用者に内容を見せて確認してから** 呼んでください。
- トークンでは次のことはできません（スマホのアプリで本人がやります）：参加する、テスト開始、申請済み、アプリをやめる、入っているかの確認。
- 1 日 300 回まで。

## 呼び方

入口は 1 つだけです。HTTP の POST で JSON を送ります。

```
POST https://sfmnrjrhlhuurbzyzpwy.supabase.co/rest/v1/rpc/ai_call
apikey: sb_publishable_0bPyXbtghVPCQcggwakgkg_dYkH7FOQ
Content-Type: application/json

{"p_token": "<トークン>", "p_action": "<操作>", "p_args": { ... }}
```

`apikey` はアプリに入っている公開用のキーで、秘密ではありません（本人の確認はトークンで行います）。

例（curl）：

```sh
curl -s https://sfmnrjrhlhuurbzyzpwy.supabase.co/rest/v1/rpc/ai_call \
  -H "apikey: sb_publishable_0bPyXbtghVPCQcggwakgkg_dYkH7FOQ" \
  -H "Content-Type: application/json" \
  -d "{\"p_token\":\"$TESTART_TOKEN\",\"p_action\":\"me\",\"p_args\":{}}"
```

返事はいつも JSON です。

- うまくいったとき：`{"ok": true, "result": ...}`
- だめなとき：`{"ok": false, "error": "<コード>", "message": "..."}`（HTTP の状態は 200 のまま）

日本語を送るときは UTF-8 にしてください。Windows の PowerShell なら `Invoke-RestMethod -Body ([Text.Encoding]::UTF8.GetBytes($json))` のようにします。

## 操作の一覧

| p_action | p_args | すること |
|---|---|---|
| `help` | なし | 操作の一覧 |
| `me` | なし | 表示名、枠（`slots.free` が空き枠）、テスターとしての記録 |
| `my_apps` | なし | 自分が登録したアプリ |
| `create_app` | 下の表 | アプリを登録する（下書き。`recruit: true` で募集も始める） |
| `update_app` | `app_id` か `package_name`、変えたい項目 | 名前・説明・アイコン・カテゴリ・目標人数・自動開始を変える（パッケージ名は変えられない） |
| `set_recruiting` | `app_id` か `package_name`、`on`（true / false） | 募集を始める／止める |
| `app_status` | `app_id` か `package_name` | アプリの状態とテスター一覧（状態・連絡の有無・感想の数） |
| `feedbacks` | `app_id` か `package_name` | 自分のアプリに届いた不具合・レビュー・要望（新しい順） |
| `open_apps` | なし | いま参加できる、ほかの人のアプリ |
| `my_participations` | なし | 自分が参加しているアプリ |
| `send_feedback` | `package_name`（または `participation_id`）、`kind`、`body`、`rating` | 参加したアプリに不具合・レビュー・要望を送る |

### create_app の項目

| 項目 | 必須 | 説明 |
|---|---|---|
| `name` | ○ | アプリ名（50 文字まで） |
| `package_name` | ○ | 例 `com.example.app`。Play Console の「アプリの詳細」にある。あとから変えられない |
| `description` | | どんなアプリか、どこを見てほしいか（500 文字まで） |
| `category` | | `game` `tool` `lifestyle` `education` `health` `social` `entertainment` `business` `other`（既定 `other`） |
| `icon_url` | | アイコン画像の URL |
| `target_testers` | | 12〜30（既定 15。抜ける人のぶん、15 がおすすめ） |
| `auto_start` | | 目標人数に届いたら自動でテスト開始（既定 true） |
| `recruit` | | true にすると、登録してすぐ募集を始める（既定 false） |

例：

```json
{"p_token": "tsa_...", "p_action": "create_app", "p_args": {
  "name": "ぴよどこ", "package_name": "com.tesaguri.piyodoko",
  "description": "ひよこを探すパズル。最初の 3 面の難しさを見てほしい",
  "category": "game", "recruit": true}}
```

### send_feedback の項目

| 項目 | 説明 |
|---|---|
| `kind` | `bug`（不具合）・`review`（レビュー）・`request`（要望） |
| `body` | 本文（2000 文字まで）。不具合なら、機種・Android の版・手順・どうなったかを書く |
| `rating` | レビューのときだけ、1〜5（任意） |

参加 1 件につき 30 件まで送れます。送れるのは、テスト中・完走・終了の参加だけです（仮参加ではまだ送れません）。

## 登録の前に、利用者に確かめること

登録しても、Play Console の準備ができていないとテスターが参加できません。登録の前に、利用者に次を確かめてください。

1. クローズドテストのリリースが「公開済み」になっている（下書き・審査中だとテストページが出ない）。
2. クローズドテストの「テスター」に、Google グループ `testart-testers@googlegroups.com` を追加している。
3. Play で一般公開ずみのアプリではない（クローズドテスト中のアプリだけが対象）。

募集できるアプリは 1 人 1 つまでです。空き枠（`me` の `slots.free`）が 0 だと一覧に出ません。ほかの人のテストに参加すると枠が増えます。

## エラーのコード

| error | 意味 | どうするか |
|---|---|---|
| `bad_token` | トークンが違う・無効にされた | アプリの「設定 → AI 連携」で作り直してもらう |
| `rate_limited` | 今日の上限（300 回） | 明日まで待つ |
| `no_consent` | アプリの「はじめに」の同意がまだ | スマホのアプリを開いて同意してもらう |
| `blocked` / `account_deleted` | 利用停止・退会ずみ | 使えません |
| `unknown_action` | 操作の名前が違う | 上の表を見る |
| `package_taken` | そのパッケージ名はもう登録されている | 自分のなら `my_apps` を見る |
| `already_active` | 募集中・テスト中のアプリがもうある | 先にそちらを終わらせる |
| `no_app` | アプリが見つからない（自分のものではない） | `my_apps` で確かめる |
| `bad_state` | 今の状態ではできない | `app_status` で状態を見る |
| `no_participation` | そのアプリに参加していない、またはまだ仮参加 | `my_participations` で確かめる |
| `too_many_feedbacks` | このアプリへの感想が 30 件に達した | |
| `bad_kind` | `kind` が違う | `bug` `review` `request` のどれか |
| そのほか（`violates check constraint` など） | 入力の形が正しくない | 文字数・パッケージ名の形・人数の範囲を見直す |

## 状態の意味

アプリ（`status`）：`draft` 下書き／`recruiting` 募集中／`paused` 募集停止／`testing` テスト中（`test_ends_at` に 14 日）／`completed` 14 日たった（本人が Play Console で本番を申請し、アプリで「申請済み」を押す）／`applied` 申請済み／`closed` やめた。

参加（`state`）：`pending` 仮参加（3 日以内に入れないと消える）／`testing` テスト中／`completed` 完走／`ended` 終了（減点なし）／`dropped` 途中で抜けた。

テスター一覧の `contact_status`：`ok` 確認できている／`quiet` 3 日以上報告なし／`no_contact` 7 日以上報告なし／`missing` 入っていない。

---
tesaguri studio ／ お問い合わせ：tesaguristudio@gmail.com

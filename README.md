# Obsidian Git (i18n Edition)

[![i18n CI](https://github.com/GennoBou/obsidian-git-i18n/actions/workflows/i18n-ci.yml/badge.svg)](https://github.com/GennoBou/obsidian-git-i18n/actions/workflows/i18n-ci.yml)
[![BRAT Release](https://github.com/GennoBou/obsidian-git-i18n/actions/workflows/brat-release.yml/badge.svg)](https://github.com/GennoBou/obsidian-git-i18n/actions/workflows/brat-release.yml)

> [!NOTE]
> **About this i18n Fork / 多言語版について**
>
> This repository is a fork of the [original plugin](https://github.com/Vinzent03/obsidian-git) that introduces internationalization (i18n) support and Japanese localization resources.
> It is intended for personal and community use. To install this plugin in Obsidian, please use the **[Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat)** plugin.
> Once the upstream plugin officially supports internationalization and Japanese locales, this repository will be archived.
>
> **Installation via BRAT**:
> 1. Enable the BRAT plugin in Obsidian.
> 2. Run `BRAT: Plugins: Add a beta plugin for testing` from the Command Palette.
> 3. Enter this repository URL: `https://github.com/GennoBou/obsidian-git-i18n`
>
> **Custom Translations (localize.json)**:
> - You can add custom translations or override text by editing `localize.json` in the plugin folder (`.obsidian/plugins/obsidian-git-i18n/`).
> - Set your target language code in `"language"` (e.g. `"en"`, `"ja"`, `"de"`), modify `"translations"`, and reload Obsidian.
> - Deleting `localize.json` and reloading Obsidian will reset it to the default template.
>
> ---
>
> 本リポジトリは、[オリジナルプラグイン](https://github.com/Vinzent03/obsidian-git) を多言語化 (i18n) し、日本語リソースを追加したフォーク版です。
> 個人利用・コミュニティ提供を目的としており、Obsidianへのインストールは **[Obsidian42 - BRAT](https://github.com/TfTHacker/obsidian42-brat)** プラグイン経由で行ってください。
> 本家が多言語対応と日本語ロケールを公式実装したとき、本リポジトリの役目は終えアーカイブされます。
>
> **BRATでのインストール手順**:
> 1. Obsidianで BRAT プラグインを有効化
> 2. コマンドパレットから `BRAT: Plugins: Add a beta plugin for testing` を実行
> 3. 本リポジトリのURL (`https://github.com/GennoBou/obsidian-git-i18n`) を入力
>
> **独自翻訳の追加・カスタマイズ (localize.json)**:
> - プラグインフォルダ内の `localize.json` を編集することで、独自翻訳の追加や上書きが可能です。
> - `"language"` に使用したい言語コード（例: 英語=`"en"`, 日本語=`"ja"`, ドイツ語=`"de"` 等）を入力し、`"translations"` 以下を書き換えてアプリを再起動すると反映されます。
> - `localize.json` を削除してアプリを再起動すると、初期状態に自動復元されます。

---

# Original Obsidian Git Plugin

A powerful community plugin for [Obsidian.md](https://obsidian.md) that brings Git integration right into your vault. Automatically commit, pull, push, and see your changes — all within Obsidian.

## 📚 Documentation

All setup instructions (including mobile), common issues, tips, and advanced configuration can be found in the 📖 [full documentation](https://publish.obsidian.md/git-doc).

> Mobile users: The plugin is **highly unstable ⚠️ !** Please check the dedicated [Mobile](#-mobile-support-%EF%B8%8F--experimental) section below.

## Key Features

- 🔁 **Automatic commit-and-sync** (commit, pull, and push) on a schedule.
- 📥 **Auto-pull on Obsidian startup**
- 📂 **Submodule support** for managing multiple repositories (desktop only and opt-in)
- 🔧 **Source Control View** to stage/unstage, commit and diff files - Open it with the `Open source control view` command.
- 📜 **History View** for browsing commit logs and changed files - Open it with the `Open history view` command.
- 🔍 **Diff View** for viewing changes in a file - Open it with the `Open diff view` command.
- 📝 **Signs in the editor** to indicate added, modified, and deleted lines/hunks (desktop only).
- GitHub integration to open files and history in your browser

> For detailed file history, consider pairing this plugin with the [Version History Diff](obsidian://show-plugin?id=obsidian-version-history-diff) plugin.

## UI Previews

### 🔧 Source Control View

Manage your file changes directly inside Obsidian like stage/unstage individual files and commit them.

![Source Control View](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/source-view.png)

### 📜 History View

Show the commit history of your repository. The commit message, author, date, and changed files can be shown. Author and date are disabled by default as shown in the screenshot, but can be enabled in the settings.

![History View](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/history-view.png)

### 🔍 Diff View 

Compare versions with a clear and concise diff viewer.
Open it from the source control view or via the `Open diff view` command.

![Diff View](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/diff-view.png)

### 📝 Signs in the Editor

View line-by-line changes directly in the editor with added, modified, and deleted line/hunk indicators. You can stage and reset changes right from the signs. There also commands to navigate between hunks and stage/reset hunks under the cursor. Needs to be enabled in the plugin settings.

![Signs](https://raw.githubusercontent.com/Vinzent03/obsidian-git/master/images/signs.png)

## Available Commands
> Not exhaustive - these are just some of the most common commands. For a full list, see the Command Palette in Obsidian.

- 🔄 Changes
  - `List changed files`: Lists all changes in a modal
  - `Open diff view`: Open diff view for the current file
  - `Stage current file`
  - `Unstage current file`
  - `Discard all changes`: Discard all changes in the repository
- ✅ Commit
  - `Commit`: If files are staged only commits those, otherwise commits only files that have been staged
  - `Commit with specific message`: Same as above, but with a custom message
  - `Commit all changes`: Commits all changes without pushing
  - `Commit all changes with specific message`: Same as above, but with a custom message
- 🔀 Commit-and-sync
  - `Commit-and-sync`: With default settings, this will commit all changes, pull, and push
  - `Commit-and-sync with specific message`: Same as above, but with a custom message
  - `Commit-and-sync and close`: Same as `Commit-and-sync`, but if running on desktop, will close the Obsidian window. Will not exit Obsidian app on mobile.
- 🌐 Remote
  - `Push`, `Pull`
  - `Edit remotes`: Add new remotes or edit existing remotes
  - `Remove remote`
  - `Clone an existing remote repo`: Opens dialog that will prompt for URL and authentication to clone a remote repo
  - `Open file on GitHub`: Open the file view of the current file on GitHub in a browser window. Note: only works on desktop
  - `Open file history on GitHub`: Open the file history of the current file on GitHub in a browser window. Note: only works on desktop
- 🏠 Manage local repository
  - `Initialize a new repo`
  - `Create new branch`
  - `Delete branch`
  - `CAUTION: Delete repository`
- 🧪 Miscellaneous
  - `Open source control view`: Opens side pane displaying [Source control view](#sidebar-view)
  - `Open history view`: Opens side pane displaying [History view](#history-view)
  - `Edit .gitignore`
  - `Add file to .gitignore`: Add current file to `.gitignore`

## 💻 Desktop Notes

### 🔐 Authentication

Some Git services may require further setup for HTTPS/SSH authentication. Refer to the [Authentication Guide](https://publish.obsidian.md/git-doc/Authentication)

### Obsidian on Linux

- ⚠️  Snap is not supported due to its sandboxing restrictions.
- ⚠️  Flatpak is not recommended, because it doesn't have access to all system files. They are actively fixing many issues, but there are still issues. Especially with more advanced setups.
- ✅ Please use AppImage or a full access installation of your system's package manager instead ([Linux installation guide](https://publish.obsidian.md/git-doc/Installation#Linux))

## 📱 Mobile Support (⚠️  Experimental)

The Git implementation on mobile is **very unstable**! I would not recommend using this plugin on mobile, but try other syncing services.

One such alternative is [GitSync](https://github.com/ViscousPot/GitSync), which is available on both Android and iOS. It is not associated with this plugin, but it may be a better option for mobile users. A tutorial for setting it up can be found [here](https://viscouspotenti.al/posts/gitsync-all-devices-tutorial).

> 🧪 The Git plugin works on mobile thanks to [isomorphic-git](https://isomorphic-git.org/), a JavaScript-based re-implementation of Git - but it comes with serious limitations and issues. It is not possible for an Obsidian plugin to use a native Git installation on Android or iOS.

### ❌ Mobile Feature Limitations

- No **SSH authentication** ([isomorphic-git issue](https://github.com/isomorphic-git/isomorphic-git/issues/231))
- Limited repo size, because of memory restrictions
- No rebase merge strategy
- No submodules support

### ⚠️ Performance Caveats

> [!caution]
> Depending on your device and available free RAM, Obsidian may
>
> - crash on clone/pull
> - create buffer overflow errors
> - run indefinitely.
>
> It's caused by the underlying git implementation on mobile, which is not efficient. I don't know how to fix this. If that's the case for you, I have to admit this plugin won't work for you. So commenting on any issue or creating a new one won't help. I am sorry.

### Tips for Mobile Use:

If you have a large repo/vault I recommend to stage individual files and only commit staged files.

## 🙋 Contact & Credits

- The Line Authoring feature was developed by [GollyTicker](https://github.com/GollyTicker), so any questions may be best answered by her.
- This plugin was initial developed by [denolehov](https://github.com/denolehov). Since March 2021, it's me [Vinzent03](https://github.com/Vinzent03) who is developing this plugin. That's why the GitHub repository got moved to my account in July 2024.
- If you have any kind of feedback or questions, feel free to reach out via GitHub issues.

## ☕ Support

If you find this plugin useful and would like to support its development, you can support me on Ko-fi.

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/F1F195IQ5)

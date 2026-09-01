import { t } from "src/i18n";
import type { App, RGB, TextComponent } from "obsidian";
import {
    moment,
    Notice,
    Platform,
    PluginSettingTab,
    Setting,
    TextAreaComponent,
} from "obsidian";
import {
    DATE_TIME_FORMAT_SECONDS,
    DEFAULT_SETTINGS,
    GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH,
} from "src/constants";
import { IsomorphicGit } from "src/gitManager/isomorphicGit";
import { SimpleGit } from "src/gitManager/simpleGit";
import { previewColor } from "src/editor/lineAuthor/lineAuthorProvider";
import type {
    LineAuthorDateTimeFormatOptions,
    LineAuthorDisplay,
    LineAuthorFollowMovement,
    LineAuthorSettings,
    LineAuthorTimezoneOption,
} from "src/editor/lineAuthor/model";
import type ObsidianGit from "src/main";
import type {
    ObsidianGitSettings,
    MergeStrategy,
    ShowAuthorInHistoryView,
    SyncMethod,
} from "src/types";
import { convertToRgb, formatMinutes, rgbToString } from "src/utils";

const FORMAT_STRING_REFERENCE_URL =
    "https://momentjs.com/docs/#/parsing/string-format/";
const LINE_AUTHOR_FEATURE_WIKI_LINK =
    "https://publish.obsidian.md/git-doc/Line+Authoring";

export class ObsidianGitSettingsTab extends PluginSettingTab {
    lineAuthorColorSettings: Map<"oldest" | "newest", Setting> = new Map();
    constructor(
        app: App,
        private plugin: ObsidianGit
    ) {
        super(app, plugin);
    }

    icon = "git-pull-request";

    private get settings() {
        return this.plugin.settings;
    }

    display(): void {
        const { containerEl } = this;
        const plugin: ObsidianGit = this.plugin;

        let commitOrSync: string;
        if (plugin.settings.differentIntervalCommitAndPush) {
            commitOrSync = t("commit");
        } else {
            commitOrSync = t("commit-and-sync");
        }

        const gitReady = plugin.gitReady;

        containerEl.empty();
        if (!gitReady) {
            containerEl.createEl("p", {
                text: t("Git is not ready When al...#f4ab6c"),
            });
            containerEl.createEl("br");
        }

        let setting: Setting;
        if (gitReady) {
            new Setting(containerEl).setName(t("Automatic")).setHeading();
            new Setting(containerEl)
                .setName(t("Split timers for automatic commit and sync"))
                .setDesc(t("Enable to use one interval for commit and another for sync."))
                .addToggle((toggle) =>
                    toggle
                        .setValue(
                            plugin.settings.differentIntervalCommitAndPush
                        )
                        .onChange(async (value) => {
                            plugin.settings.differentIntervalCommitAndPush =
                                value;
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit", "push");
                            this.refreshDisplayWithDelay();
                        })
                );

            new Setting(containerEl)
                .setName(t("Auto {action} interval (minutes)", { action: commitOrSync }))
                .setDesc(t("Commit and sync changes every X minutes...#41b3df", { action: plugin.settings.differentIntervalCommitAndPush ? t("Commit") : t("Commit and sync") }))
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoSaveInterval",
                    });
                    text.setPlaceholder(
                        String(DEFAULT_SETTINGS.autoSaveInterval)
                    );
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoSaveInterval = Number(value);
                        } else {
                            plugin.settings.autoSaveInterval =
                                DEFAULT_SETTINGS.autoSaveInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("commit");
                    });
                });

            setting = new Setting(containerEl)
                .setName(t("Auto {action} after stopping file edits", { action: commitOrSync }))
                .setDesc(
                    t("Requires the action inte...#3b1c03", { action: commitOrSync, time: formatMinutes(plugin.settings.autoSaveInterval) })
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoBackupAfterFileChange)
                        .onChange(async (value) => {
                            plugin.settings.autoBackupAfterFileChange = value;
                            this.refreshDisplayWithDelay();

                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.setLastSaveToLastCommit
            );

            setting = new Setting(containerEl)
                .setName(t("Auto {action} after latest commit", { action: commitOrSync }))
                .setDesc(
                    t("If turned on sets last a...#29fc0c", { action: commitOrSync })
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.setLastSaveToLastCommit)
                        .onChange(async (value) => {
                            plugin.settings.setLastSaveToLastCommit = value;
                            await plugin.saveSettings();
                            plugin.automaticsManager.reload("commit");
                            this.refreshDisplayWithDelay();
                        })
                );
            this.mayDisableSetting(
                setting,
                plugin.settings.autoBackupAfterFileChange
            );

            setting = new Setting(containerEl)
                .setName(t("Auto push interval (minutes)"))
                .setDesc(t("Push commits every X minutes. Set to 0 (default) to disable."))
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoPushInterval",
                    });
                    text.setPlaceholder(
                        String(DEFAULT_SETTINGS.autoPushInterval)
                    );
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoPushInterval = Number(value);
                        } else {
                            plugin.settings.autoPushInterval =
                                DEFAULT_SETTINGS.autoPushInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("push");
                    });
                });
            this.mayDisableSetting(
                setting,
                !plugin.settings.differentIntervalCommitAndPush
            );

            new Setting(containerEl)
                .setName(t("Auto pull interval (minutes)"))
                .setDesc(t("Pull changes every X minutes. Set to 0 (default) to disable."))
                .addText((text) => {
                    text.inputEl.type = "number";
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoPullInterval",
                    });
                    text.setPlaceholder(
                        String(DEFAULT_SETTINGS.autoPullInterval)
                    );
                    text.onChange(async (value) => {
                        if (value !== "") {
                            plugin.settings.autoPullInterval = Number(value);
                        } else {
                            plugin.settings.autoPullInterval =
                                DEFAULT_SETTINGS.autoPullInterval;
                        }
                        await plugin.saveSettings();
                        plugin.automaticsManager.reload("pull");
                    });
                });

            new Setting(containerEl)
                .setName(t("Auto {action} only staged files", { action: commitOrSync }))
                .setDesc(
                    t("If turned on only staged...#25b325", { action: commitOrSync })
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoCommitOnlyStaged)
                        .onChange(async (value) => {
                            plugin.settings.autoCommitOnlyStaged = value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName(
                    t("Specify custom commit message on auto {action}", { action: commitOrSync })
                )
                .setDesc(t("You will get a pop up to specify your message."))
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.customMessageOnAutoBackup)
                        .onChange(async (value) => {
                            plugin.settings.customMessageOnAutoBackup = value;
                            await plugin.saveSettings();
                            this.refreshDisplayWithDelay();
                        })
                );

            setting = new Setting(containerEl)
                .setName(t("Commit message on auto {action}", { action: commitOrSync }))
                .setDesc(t("Available placeholders d...#77b167"))
                .addTextArea((text) => {
                    text.setPlaceholder(
                        DEFAULT_SETTINGS.autoCommitMessage
                    ).onChange(async (value) => {
                        if (value === "") {
                            plugin.settings.autoCommitMessage =
                                DEFAULT_SETTINGS.autoCommitMessage;
                        } else {
                            plugin.settings.autoCommitMessage = value;
                        }
                        await plugin.saveSettings();
                    });
                    this.setNonDefaultValue({
                        text,
                        settingsProperty: "autoCommitMessage",
                    });
                });
            this.mayDisableSetting(
                setting,
                plugin.settings.customMessageOnAutoBackup
            );

            new Setting(containerEl).setName(t("Commit message")).setHeading();

            const manualCommitMessageSetting = new Setting(containerEl)
                .setName(t("Commit message on manual commit"))
                .setDesc(t("Available placeholders d...#5e47b9"));
            manualCommitMessageSetting.addTextArea((text) => {
                manualCommitMessageSetting.addButton((button) => {
                    button
                        .setIcon("reset")
                        .setTooltip(
                            t("Set to default message...#153630", { message: DEFAULT_SETTINGS.commitMessage })
                        )
                        .onClick(() => {
                            text.setValue(DEFAULT_SETTINGS.commitMessage);
                            text.onChanged();
                        });
                });
                text.setValue(plugin.settings.commitMessage);
                text.onChange(async (value) => {
                    plugin.settings.commitMessage = value;
                    await plugin.saveSettings();
                });
            });

            if (Platform.isDesktopApp)
                new Setting(containerEl)
                    .setName(t("Commit message script"))
                    .setDesc(t("A script that is run usi...#1ead34"))
                    .addText((text) => {
                        text.onChange(async (value) => {
                            if (value === "") {
                                plugin.settings.commitMessageScript =
                                    DEFAULT_SETTINGS.commitMessageScript;
                            } else {
                                plugin.settings.commitMessageScript = value;
                            }
                            await plugin.saveSettings();
                        });
                        this.setNonDefaultValue({
                            text,
                            settingsProperty: "commitMessageScript",
                        });
                    });

            const datePlaceholderSetting = new Setting(containerEl)
                .setName(t("{{date}} placeholder format"))
                .addMomentFormat((text) =>
                    text
                        .setDefaultFormat(plugin.settings.commitDateFormat)
                        .setValue(plugin.settings.commitDateFormat)
                        .onChange(async (value) => {
                            plugin.settings.commitDateFormat = value;
                            await plugin.saveSettings();
                        })
                );

            datePlaceholderSetting.descEl.createSpan({
                text: t("Specify custom date form...#30aa17", { format: DATE_TIME_FORMAT_SECONDS }),
            });
            datePlaceholderSetting.descEl.createEl("a", {
                text: t("Moment.js documentation"),
                href: FORMAT_STRING_REFERENCE_URL,
                attr: {
                    target: "_blank",
                },
            });
            datePlaceholderSetting.descEl.createSpan({
                text: t("for more formats."),
            });

            new Setting(containerEl)
                .setName(t("{{hostname}} placeholder replacement"))
                .setDesc(t("Specify custom hostname...#16130a"))
                .addText((text) =>
                    text
                        .setValue(plugin.localStorage.getHostname() ?? "")
                        .onChange((value) => {
                            plugin.localStorage.setHostname(value);
                        })
                );

            new Setting(containerEl)
                .setName(t("Preview commit message"))
                .addButton((button) =>
                    button.setButtonText(t("Preview")).onClick(async () => {
                        const commitMessagePreview =
                            await plugin.gitManager.formatCommitMessage(
                                plugin.settings.commitMessage
                            );
                        new Notice(`${commitMessagePreview}`);
                    })
                );

            new Setting(containerEl)
                .setName(t("List filenames affected by commit in the commit body"))
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.listChangedFilesInMessageBody)
                        .onChange(async (value) => {
                            plugin.settings.listChangedFilesInMessageBody =
                                value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl).setName(t("Pull")).setHeading();

            if (plugin.gitManager instanceof SimpleGit)
                new Setting(containerEl)
                    .setName(t("Merge strategy"))
                    .setDesc(t("Decide how to integrate...#976d67"))
                    .addDropdown((dropdown) => {
                        const options: Record<SyncMethod, string> = {
                            merge: t("Merge"),
                            rebase: t("Rebase"),
                            reset: t("Other sync service Only...#417e44"),
                        };
                        dropdown.addOptions(options);
                        dropdown.setValue(plugin.settings.syncMethod);

                        dropdown.onChange(async (option) => {
                            plugin.settings.syncMethod = option as SyncMethod;
                            await plugin.saveSettings();
                        });
                    });

            new Setting(containerEl)
                .setName(t("Merge strategy on conflicts"))
                .setDesc(t("Decide how to solve conf...#efa4eb"))
                .addDropdown((dropdown) => {
                    const options: Record<MergeStrategy, string> = {
                        none: t("None (git default)"),
                        ours: t("Our changes"),
                        theirs: t("Their changes"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(plugin.settings.mergeStrategy);

                    dropdown.onChange(async (option) => {
                        plugin.settings.mergeStrategy = option as MergeStrategy;
                        await plugin.saveSettings();
                    });
                });

            new Setting(containerEl)
                .setName(t("Pull on startup"))
                .setDesc(t("Automatically pull commits when Obsidian starts."))
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.autoPullOnBoot)
                        .onChange(async (value) => {
                            plugin.settings.autoPullOnBoot = value;
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName(t("Commit-and-sync"))
                .setDesc(t("Commit-and-sync with def...#8c16b9"))
                .setHeading();

            setting = new Setting(containerEl)
                .setName(t("Push on commit-and-sync"))
                .setDesc(
                    t("Most of the time you wan...#5444c8", { action: plugin.settings.pullBeforePush ? "and pull " : "" })
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(!plugin.settings.disablePush)
                        .onChange(async (value) => {
                            plugin.settings.disablePush = !value;
                            this.refreshDisplayWithDelay();
                            await plugin.saveSettings();
                        })
                );

            new Setting(containerEl)
                .setName(t("Pull on commit-and-sync"))
                .setDesc(
                    t("On commit-and-sync pull...#1e68d3", { action: plugin.settings.disablePush ? "" : "and push " })
                )
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.pullBeforePush)
                        .onChange(async (value) => {
                            plugin.settings.pullBeforePush = value;
                            this.refreshDisplayWithDelay();
                            await plugin.saveSettings();
                        })
                );

            if (plugin.gitManager instanceof SimpleGit) {
                new Setting(containerEl)
                    .setName(t("Squash commits before push"))
                    .setDesc(t("On commit-and-sync squas...#c5c530"))
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.squashCommitsBeforePush)
                            .onChange(async (value) => {
                                plugin.settings.squashCommitsBeforePush = value;
                                await plugin.saveSettings();
                            })
                    );
            }

            if (plugin.gitManager instanceof SimpleGit) {
                new Setting(containerEl)
                    .setName(t("Hunk management"))
                    .setDesc(t("Hunks are sections of gr...#fddec8"))
                    .setHeading();

                new Setting(containerEl)
                    .setName(t("Signs"))
                    .setDesc(t("This allows you to see y...#232b03"))
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.hunks.showSigns)
                            .onChange(async (value) => {
                                plugin.settings.hunks.showSigns = value;
                                await plugin.saveSettings();
                                plugin.editorIntegration.refreshSignsSettings();
                            })
                    );

                new Setting(containerEl)
                    .setName(t("Hunk commands"))
                    .setDesc(t("Adds commands to stage r...#e41155"))
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.hunks.hunkCommands)
                            .onChange(async (value) => {
                                plugin.settings.hunks.hunkCommands = value;
                                await plugin.saveSettings();

                                plugin.editorIntegration.refreshSignsSettings();
                            })
                    );

                new Setting(containerEl)
                    .setName(t("Status bar with summary of line changes"))
                    .addDropdown((toggle) =>
                        toggle
                            .addOptions({
                                disabled: t("Disabled"),
                                colored: t("Colored"),
                                monochrome: t("Monochrome"),
                            })
                            .setValue(plugin.settings.hunks.statusBar)
                            .onChange(async (option) => {
                                plugin.settings.hunks.statusBar =
                                    option as ObsidianGitSettings["hunks"]["statusBar"];
                                await plugin.saveSettings();
                                plugin.editorIntegration.refreshSignsSettings();
                            })
                    );

                new Setting(containerEl)
                    .setName(t("Line author information"))
                    .setHeading();

                this.addLineAuthorInfoSettings();
            }
        }

        new Setting(containerEl).setName(t("History view")).setHeading();

        new Setting(containerEl)
            .setName(t("Show Author"))
            .setDesc(t("Show the author of the commit in the history view."))
            .addDropdown((dropdown) => {
                const options: Record<ShowAuthorInHistoryView, string> = {
                    hide: t("Hide"),
                    full: t("Full"),
                    initials: t("Initials"),
                };
                dropdown.addOptions(options);
                dropdown.setValue(plugin.settings.authorInHistoryView);
                dropdown.onChange(async (option) => {
                    plugin.settings.authorInHistoryView =
                        option as ShowAuthorInHistoryView;
                    await plugin.saveSettings();
                    await plugin.refresh();
                });
            });

        new Setting(containerEl)
            .setName(t("Show Date"))
            .setDesc(t("Show the date of the com...#fe366c"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.dateInHistoryView)
                    .onChange(async (value) => {
                        plugin.settings.dateInHistoryView = value;
                        await plugin.saveSettings();
                        await plugin.refresh();
                    })
            );

        new Setting(containerEl).setName(t("Source control view")).setHeading();

        new Setting(containerEl)
            .setName(t("Automatically refresh source control view on file changes"))
            .setDesc(t("On slower machines this...#0b8066"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.refreshSourceControl)
                    .onChange(async (value) => {
                        plugin.settings.refreshSourceControl = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Source control view refresh interval"))
            .setDesc(t("Milliseconds to wait aft...#2f5208"))
            .addText((text) => {
                const MIN_SOURCE_CONTROL_REFRESH_INTERVAL = 500;
                text.inputEl.type = "number";
                this.setNonDefaultValue({
                    text,
                    settingsProperty: "refreshSourceControlTimer",
                });
                text.setPlaceholder(
                    String(DEFAULT_SETTINGS.refreshSourceControlTimer)
                );
                text.onChange(async (value) => {
                    // Without this check, if the textbox is empty or the input is invalid, MIN_SOURCE_CONTROL_REFRESH_INTERVAL would be saved instead of saving the default value.
                    if (value !== "" && Number.isInteger(Number(value))) {
                        plugin.settings.refreshSourceControlTimer = Math.max(
                            Number(value),
                            MIN_SOURCE_CONTROL_REFRESH_INTERVAL
                        );
                    } else {
                        plugin.settings.refreshSourceControlTimer =
                            DEFAULT_SETTINGS.refreshSourceControlTimer;
                    }
                    await plugin.saveSettings();
                    plugin.setRefreshDebouncer();
                });
            });
        new Setting(containerEl).setName(t("Miscellaneous")).setHeading();

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName(t("Diff view style"))
                .setDesc(t("Set the style for the di...#1cbda1"))
                .addDropdown((dropdown) => {
                    const options: Record<
                        ObsidianGitSettings["diffStyle"],
                        string
                    > = {
                        split: t("Split"),
                        git_unified: t("Unified"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(plugin.settings.diffStyle);
                    dropdown.onChange(async (option) => {
                        plugin.settings.diffStyle =
                            option as ObsidianGitSettings["diffStyle"];
                        await plugin.saveSettings();
                    });
                });
        }

        new Setting(containerEl)
            .setName(t("Disable informative notifications"))
            .setDesc(t("Disable informative noti...#e94ca1"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.disablePopups)
                    .onChange(async (value) => {
                        plugin.settings.disablePopups = value;
                        this.refreshDisplayWithDelay();
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Disable error notifications"))
            .setDesc(t("Disable error notificati...#d3f5bd"))
            .addToggle((toggle) =>
                toggle
                    .setValue(!plugin.settings.showErrorNotices)
                    .onChange(async (value) => {
                        plugin.settings.showErrorNotices = !value;
                        await plugin.saveSettings();
                    })
            );

        if (!plugin.settings.disablePopups)
            new Setting(containerEl)
                .setName(t("Hide notifications for no changes"))
                .setDesc(t("Don t show notifications...#f4c70b"))
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.disablePopupsForNoChanges)
                        .onChange(async (value) => {
                            plugin.settings.disablePopupsForNoChanges = value;
                            await plugin.saveSettings();
                        })
                );

        new Setting(containerEl)
            .setName(t("Show status bar"))
            .setDesc(
                t("Obsidian must be restarted for the changes to take affect.")
            )
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.showStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("File menu integration"))
            .setDesc(t("Add Stage Unstage and Ad...#b0fea7"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showFileMenu)
                    .onChange(async (value) => {
                        plugin.settings.showFileMenu = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Show branch status bar"))
            .setDesc(t("Obsidian must be restarted for the changes to take affect."))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.showBranchStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.showBranchStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName(t("Show the count of modified files in the status bar"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.settings.changedFilesInStatusBar)
                    .onChange(async (value) => {
                        plugin.settings.changedFilesInStatusBar = value;
                        await plugin.saveSettings();
                    })
            );

        if (plugin.gitManager instanceof IsomorphicGit) {
            new Setting(containerEl)
                .setName(t("Authentication/commit author"))
                .setHeading();
        } else {
            new Setting(containerEl).setName(t("Commit author")).setHeading();
        }

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName(t("Username on your git server. E.g. your username on GitHub"))
                .addText((cb) => {
                    cb.setValue(plugin.localStorage.getUsername() ?? "");
                    cb.onChange((value) => {
                        plugin.localStorage.setUsername(value);
                    });
                });

        if (plugin.gitManager instanceof IsomorphicGit)
            new Setting(containerEl)
                .setName(t("Password/Personal access token"))
                .setDesc(t("Type in your password Yo...#b08001"))
                .addText((cb) => {
                    cb.inputEl.autocapitalize = "off";
                    cb.inputEl.autocomplete = "off";
                    cb.inputEl.spellcheck = false;
                    cb.onChange((value) => {
                        plugin.localStorage.setPassword(value);
                    });
                });

        if (plugin.gitReady)
            new Setting(containerEl)
                .setName(t("Author name for commit"))
                .addText(async (cb) => {
                    cb.setValue(
                        (await plugin.gitManager.getConfig("user.name")) ?? ""
                    );
                    cb.onChange(async (value) => {
                        await plugin.gitManager.setConfig(
                            "user.name",
                            value == "" ? undefined : value
                        );
                    });
                });

        if (plugin.gitReady)
            new Setting(containerEl)
                .setName(t("Author email for commit"))
                .addText(async (cb) => {
                    cb.setValue(
                        (await plugin.gitManager.getConfig("user.email")) ?? ""
                    );
                    cb.onChange(async (value) => {
                        await plugin.gitManager.setConfig(
                            "user.email",
                            value == "" ? undefined : value
                        );
                    });
                });

        new Setting(containerEl)
            .setName(t("Advanced"))
            .setDesc(t("These settings usually d...#25c9dc"))
            .setHeading();

        if (plugin.gitManager instanceof SimpleGit) {
            new Setting(containerEl)
                .setName(t("Update submodules"))
                .setDesc(t("Commit-and-sync and pull...#11001e"))
                .addToggle((toggle) =>
                    toggle
                        .setValue(plugin.settings.updateSubmodules)
                        .onChange(async (value) => {
                            plugin.settings.updateSubmodules = value;
                            await plugin.saveSettings();
                        })
                );
            if (plugin.settings.updateSubmodules) {
                new Setting(containerEl)
                    .setName(t("Submodule recurse checkout/switch"))
                    .setDesc(t("Whenever a checkout happ...#5ffe41"))
                    .addToggle((toggle) =>
                        toggle
                            .setValue(plugin.settings.submoduleRecurseCheckout)
                            .onChange(async (value) => {
                                plugin.settings.submoduleRecurseCheckout =
                                    value;
                                await plugin.saveSettings();
                            })
                    );
            }
        }

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Custom Git binary path"))
                .setDesc(t("Specify the path to the...#0d223a"))
                .addText((cb) => {
                    cb.setValue(plugin.localStorage.getGitPath() ?? "");
                    cb.setPlaceholder("git");
                    cb.onChange((value) => {
                        plugin.localStorage.setGitPath(value);
                        plugin.gitManager
                            .updateGitPath(value || "git")
                            .catch((e) => plugin.displayError(e));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Additional environment variables"))
                .setDesc(t("Use each line for a new...#641f73"))
                .addTextArea((cb) => {
                    cb.setPlaceholder("GIT_DIR=/path/to/git/dir");
                    cb.setValue(plugin.localStorage.getEnvVars().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setEnvVars(value.split("\n"));
                    });
                });

        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Additional PATH environment variable paths"))
                .setDesc(t("Use each line for one path"))
                .addTextArea((cb) => {
                    cb.setValue(plugin.localStorage.getPATHPaths().join("\n"));
                    cb.onChange((value) => {
                        plugin.localStorage.setPATHPaths(value.split("\n"));
                    });
                });
        if (plugin.gitManager instanceof SimpleGit)
            new Setting(containerEl)
                .setName(t("Reload with new environment variables"))
                .setDesc(t("Removing previously adde...#f7082b"))
                .addButton((cb) => {
                    cb.setButtonText(t("Reload"));
                    cb.setCta();
                    cb.onClick(async () => {
                        await (plugin.gitManager as SimpleGit).setGitInstance();
                    });
                });

        new Setting(containerEl)
            .setName(t("Custom base path (Git repository path)"))
            .setDesc(t("Sets the relative path t...#ce7ba3"))
            .addText((cb) => {
                cb.setValue(plugin.settings.basePath);
                cb.setPlaceholder("directory/directory-with-git-repo");
                cb.onChange(async (value) => {
                    plugin.settings.basePath = value;
                    await plugin.saveSettings();
                    plugin.gitManager
                        .updateBasePath(value || "")
                        .catch((e) => plugin.displayError(e));
                });
            });

        new Setting(containerEl)
            .setName(t("Custom Git directory pat...#683e88"))
            .setDesc(t("Corresponds to the GIT D...#800b06"))
            .addText((cb) => {
                cb.setValue(plugin.settings.gitDir);
                cb.setPlaceholder(".git");
                cb.onChange(async (value) => {
                    plugin.settings.gitDir = value;
                    await plugin.saveSettings();
                });
            });

        new Setting(containerEl)
            .setName(t("Disable on this device"))
            .setDesc(t("Disables the plugin on t...#3fbbff"))
            .addToggle((toggle) =>
                toggle
                    .setValue(plugin.localStorage.getPluginDisabled())
                    .onChange((value) => {
                        plugin.localStorage.setPluginDisabled(value);
                        if (value) {
                            plugin.unloadPlugin();
                        } else {
                            plugin
                                .init({ fromReload: true })
                                .catch((e) => plugin.displayError(e));
                        }
                        new Notice(
                            "Obsidian must be restarted for the changes to take affect."
                        );
                    })
            );

        new Setting(containerEl).setName(t("Support")).setHeading();
        new Setting(containerEl)
            .setName(t("Donate"))
            .setDesc(t("If you like this Plugin...#e2cdcb"))
            .addButton((bt) => {
                const link = bt.buttonEl.parentElement?.createEl("a", {
                    href: "https://ko-fi.com/F1F195IQ5",
                    attr: {
                        target: "_blank",
                    },
                });
                if (link) {
                    link.createEl("img", {
                        attr: {
                            height: "36",
                            style: "border:0px;height:36px;",
                            src: "https://cdn.ko-fi.com/cdn/kofi3.png?v=3",
                            border: "0",
                            alt: "Buy Me a Coffee at ko-fi.com",
                        },
                    });
                    bt.buttonEl.remove();
                }
            });

        const debugDiv = containerEl.createDiv();
        debugDiv.setAttr("align", "center");
        debugDiv.setAttr("style", "margin: var(--size-4-2)");

        const debugButton = debugDiv.createEl("button");
        debugButton.setText(t("Copy Debug Information"));
        debugButton.onclick = async () => {
            await window.navigator.clipboard.writeText(
                JSON.stringify(
                    {
                        settings: this.plugin.settings,
                        pluginVersion: this.plugin.manifest.version,
                    },
                    null,
                    4
                )
            );
            new Notice(
                t("Debug information copied...#51c911")
            );
        };

        if (Platform.isDesktopApp) {
            const info = containerEl.createDiv();
            info.setAttr("align", "center");
            info.setText(
                t("Debugging and logging: You can always see the logs...#a72d1f")
            );
            const keys = containerEl.createDiv();
            keys.setAttr("align", "center");
            keys.addClass("obsidian-git-shortcuts");
            if (Platform.isMacOS === true) {
                keys.createEl("kbd", { text: "CMD (⌘) + OPTION (⌥) + I" });
            } else {
                keys.createEl("kbd", { text: "CTRL + SHIFT + I" });
            }
        }
    }

    mayDisableSetting(setting: Setting, disable: boolean) {
        if (disable) {
            setting.setDisabled(disable);
            setting.setClass("obsidian-git-disabled");
        }
    }

    public configureLineAuthorShowStatus(show: boolean) {
        this.settings.lineAuthor.show = show;
        void this.plugin.saveSettings();

        if (show) this.plugin.editorIntegration.activateLineAuthoring();
        else this.plugin.editorIntegration.deactiveLineAuthoring();
    }

    /**
     * Persists the setting {@link key} with value {@link value} and
     * refreshes the line author info views.
     */
    public async lineAuthorSettingHandler<
        K extends keyof ObsidianGitSettings["lineAuthor"],
    >(key: K, value: ObsidianGitSettings["lineAuthor"][K]): Promise<void> {
        this.settings.lineAuthor[key] = value;
        await this.plugin.saveSettings();
        this.plugin.editorIntegration.lineAuthoringFeature.refreshLineAuthorViews();
    }

    /**
     * Ensure, that certain last shown values are persistent in the settings.
     *
     * Necessary for the line author info gutter context menus.
     */
    public beforeSaveSettings() {
        const laSettings = this.settings.lineAuthor;
        if (laSettings.authorDisplay !== "hide") {
            laSettings.lastShownAuthorDisplay = laSettings.authorDisplay;
        }
        if (laSettings.dateTimeFormatOptions !== "hide") {
            laSettings.lastShownDateTimeFormatOptions =
                laSettings.dateTimeFormatOptions;
        }
    }

    private addLineAuthorInfoSettings() {
        const baseLineAuthorInfoSetting = new Setting(this.containerEl).setName(
            t("Show commit authoring information next to each line")
        );

        if (
            !this.plugin.editorIntegration.lineAuthoringFeature.isAvailableOnCurrentPlatform()
        ) {
            baseLineAuthorInfoSetting
                .setDesc(t("Only available on desktop currently."))
                .setDisabled(true);
        }

        baseLineAuthorInfoSetting.descEl.createEl("a", {
            href: LINE_AUTHOR_FEATURE_WIKI_LINK,
            text: t("Feature guide and quick examples"),
            attr: {
                target: "_blank",
            },
        });
        baseLineAuthorInfoSetting.descEl.createEl("br");
        baseLineAuthorInfoSetting.descEl.createSpan({
            text: t("The commit hash author n...#47eca3"),
        });
        baseLineAuthorInfoSetting.descEl.createEl("br");
        baseLineAuthorInfoSetting.descEl.createSpan({
            text: t("Hide everything, to only show the age-colored sidebar."),
        });

        baseLineAuthorInfoSetting.addToggle((toggle) =>
            toggle.setValue(this.settings.lineAuthor.show).onChange((value) => {
                this.configureLineAuthorShowStatus(value);
                this.refreshDisplayWithDelay();
            })
        );

        if (this.settings.lineAuthor.show) {
            const trackMovement = new Setting(this.containerEl)
                .setName(t("Follow movement and copies across files and commits"))
                .addDropdown((dropdown) => {
                    dropdown.addOptions({
                        inactive: t("Do not follow (default)"),
                        "same-commit": t("Follow within same commit"),
                        "all-commits": t("Follow within all commits (maybe slow)"),
                    });
                    dropdown.setValue(this.settings.lineAuthor.followMovement);
                    dropdown.onChange((value) =>
                        this.lineAuthorSettingHandler(
                            "followMovement",
                            value as LineAuthorFollowMovement
                        )
                    );
                });

            trackMovement.descEl.createSpan({
                text: "By default (deactivated), each line only shows the newest commit where it was changed.",
            });
            trackMovement.descEl.createEl("br");
            trackMovement.descEl.createSpan({ text: "With " });
            trackMovement.descEl.createEl("i", { text: "same commit" });
            trackMovement.descEl.createSpan({
                text: ", cut-copy-paste-ing of text is followed within the same commit and the original commit of authoring will be shown.",
            });
            trackMovement.descEl.createEl("br");
            trackMovement.descEl.createSpan({ text: "With " });
            trackMovement.descEl.createEl("i", { text: "all commits" });
            trackMovement.descEl.createSpan({
                text: ", cut-copy-paste-ing text inbetween multiple commits will be detected.",
            });
            trackMovement.descEl.createEl("br");
            trackMovement.descEl.createSpan({ text: "It uses " });
            trackMovement.descEl.createEl("a", {
                href: "https://git-scm.com/docs/git-blame",
                text: "git-blame",
                attr: {
                    target: "_blank",
                },
            });
            trackMovement.descEl.createSpan({
                text: ` and for matches (at least ${GIT_LINE_AUTHORING_MOVEMENT_DETECTION_MINIMAL_LENGTH} characters) within the same (or all) commit(s), `,
            });
            trackMovement.descEl.createEl("em", { text: "the originating" });
            trackMovement.descEl.createSpan({
                text: " commit's information is shown.",
            });

            new Setting(this.containerEl)
                .setName(t("Show commit hash"))
                .addToggle((tgl) => {
                    tgl.setValue(this.settings.lineAuthor.showCommitHash);
                    tgl.onChange((value: boolean) =>
                        this.lineAuthorSettingHandler("showCommitHash", value)
                    );
                });

            new Setting(this.containerEl)
                .setName(t("Author name display"))
                .setDesc(t("If and how the author is displayed"))
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorDisplay, string> = {
                        hide: t("Hide"),
                        initials: t("Initials (default)"),
                        "first name": t("First name"),
                        "last name": t("Last name"),
                        full: t("Full name"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(this.settings.lineAuthor.authorDisplay);

                    dropdown.onChange(async (value) =>
                        this.lineAuthorSettingHandler(
                            "authorDisplay",
                            value as LineAuthorDisplay
                        )
                    );
                });

            new Setting(this.containerEl)
                .setName(t("Authoring date display"))
                .setDesc(t("If and how the date and...#490b53"))
                .addDropdown((dropdown) => {
                    const options: Record<
                        LineAuthorDateTimeFormatOptions,
                        string
                    > = {
                        hide: t("Hide"),
                        date: t("Date (default)"),
                        datetime: t("Date and time"),
                        "natural language": t("Natural language"),
                        custom: t("Custom"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(
                        this.settings.lineAuthor.dateTimeFormatOptions
                    );

                    dropdown.onChange(async (value) => {
                        await this.lineAuthorSettingHandler(
                            "dateTimeFormatOptions",
                            value as LineAuthorDateTimeFormatOptions
                        );
                        this.refreshDisplayWithDelay();
                    });
                });

            if (this.settings.lineAuthor.dateTimeFormatOptions === "custom") {
                const dateTimeFormatCustomStringSetting = new Setting(
                    this.containerEl
                );

                dateTimeFormatCustomStringSetting
                    .setName(t("Custom authoring date format"))
                    .addText((cb) => {
                        cb.setValue(
                            this.settings.lineAuthor.dateTimeFormatCustomString
                        );
                        cb.setPlaceholder("YYYY-MM-DD HH:mm");

                        cb.onChange(async (value) => {
                            await this.lineAuthorSettingHandler(
                                "dateTimeFormatCustomString",
                                value
                            );
                            this.setCustomDateTimeDescription(
                                dateTimeFormatCustomStringSetting.descEl,
                                value
                            );
                        });
                    });

                this.setCustomDateTimeDescription(
                    dateTimeFormatCustomStringSetting.descEl,
                    this.settings.lineAuthor.dateTimeFormatCustomString
                );
            }

            const timezoneSetting = new Setting(this.containerEl)
                .setName(t("Authoring date display timezone"))
                .addDropdown((dropdown) => {
                    const options: Record<LineAuthorTimezoneOption, string> = {
                        "viewer-local": t("My local (default)"),
                        "author-local": t("Author s local...#455109"),
                        utc0000: t("UTC+0000/Z"),
                    };
                    dropdown.addOptions(options);
                    dropdown.setValue(
                        this.settings.lineAuthor.dateTimeTimezone
                    );

                    dropdown.onChange(async (value) =>
                        this.lineAuthorSettingHandler(
                            "dateTimeTimezone",
                            value as LineAuthorTimezoneOption
                        )
                    );
                });
            timezoneSetting.descEl.empty();
            timezoneSetting.descEl.createSpan({
                text: "The time-zone in which the authoring date should be shown.\nEither your local time-zone (default),\nthe author's time-zone during commit creation or\n",
            });
            timezoneSetting.descEl.createEl("a", {
                text: "UTC±00:00",
                href: "https://en.wikipedia.org/wiki/UTC%C2%B100:00",
            });
            timezoneSetting.descEl.createSpan({
                text: ".",
            });

            const oldestAgeSetting = new Setting(this.containerEl).setName(t("Oldest age in coloring"));

            this.setOldestAgeDescription(
                oldestAgeSetting.descEl,
                this.settings.lineAuthor.coloringMaxAge
            );

            oldestAgeSetting.addText((text) => {
                text.setPlaceholder("1y");
                text.setValue(this.settings.lineAuthor.coloringMaxAge);
                text.onChange(async (value) => {
                    const duration = parseColoringMaxAgeDuration(value);
                    const valid = duration !== undefined;
                    this.setOldestAgeDescription(
                        oldestAgeSetting.descEl,
                        value
                    );
                    if (valid) {
                        await this.lineAuthorSettingHandler(
                            "coloringMaxAge",
                            value
                        );
                        this.refreshColorSettingsName("oldest");
                    }
                });
            });

            this.createColorSetting("newest");
            this.createColorSetting("oldest");

            const textColorSetting = new Setting(this.containerEl)
                .setName(t("Text color"))
                .addText((field) => {
                    field.setValue(this.settings.lineAuthor.textColorCss);
                    field.onChange(async (value) => {
                        await this.lineAuthorSettingHandler(
                            "textColorCss",
                            value
                        );
                    });
                });
            textColorSetting.descEl.empty();
            textColorSetting.descEl.createSpan({
                text: t("The CSS color of the gutter text."),
            });
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createSpan({
                text: "It is highly recommended to use ",
            });
            textColorSetting.descEl.createEl("a", {
                text: "CSS variables",
                href: "https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties",
            });
            textColorSetting.descEl.createSpan({
                text: " defined by themes (e.g. ",
            });
            textColorSetting.descEl.createEl("pre", {
                text: "var(--text-muted)",
                attr: {
                    style: "display:inline",
                },
            });
            textColorSetting.descEl.createSpan({ text: " or " });
            textColorSetting.descEl.createEl("pre", {
                text: "var(--text-on-accent)",
                attr: {
                    style: "display:inline",
                },
            });
            textColorSetting.descEl.createSpan({
                text: "), because they automatically adapt to theme changes.",
            });
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createEl("br");
            textColorSetting.descEl.createSpan({ text: "See: " });
            textColorSetting.descEl.createEl("a", {
                text: "List of available CSS variables in Obsidian",
                href: "https://github.com/obsidian-community/obsidian-theme-template/blob/main/obsidian.css",
            });

            const ignoreWhitespaceSetting = new Setting(this.containerEl)
                .setName(t("Ignore whitespace and newlines in changes"))
                .addToggle((tgl) => {
                    tgl.setValue(this.settings.lineAuthor.ignoreWhitespace);
                    tgl.onChange((value) =>
                        this.lineAuthorSettingHandler("ignoreWhitespace", value)
                    );
                });
            ignoreWhitespaceSetting.descEl.empty();
            ignoreWhitespaceSetting.descEl.createSpan({
                text: "Whitespace and newlines are interpreted as part of the document and in changes by default (hence not ignored). This makes the last line being shown as 'changed' when a new subsequent line is added, even if the previously last line's text is the same.",
            });
            ignoreWhitespaceSetting.descEl.createEl("br");
            ignoreWhitespaceSetting.descEl.createSpan({
                text: "If you don't care about purely-whitespace changes (e.g. list nesting / quote indentation changes), then activating this will provide more meaningful change detection.",
            });
        }
    }

    private createColorSetting(which: "oldest" | "newest") {
        const setting = new Setting(this.containerEl)
            .setName("")
            .addText((text) => {
                const color = pickColor(which, this.settings.lineAuthor);
                const defaultColor = pickColor(
                    which,
                    DEFAULT_SETTINGS.lineAuthor
                );
                text.setPlaceholder(rgbToString(defaultColor));
                text.setValue(rgbToString(color));
                text.onChange(async (colorNew) => {
                    const rgb = convertToRgb(colorNew);
                    if (rgb !== undefined) {
                        const key =
                            which === "newest" ? "colorNew" : "colorOld";
                        await this.lineAuthorSettingHandler(key, rgb);
                    }
                    this.refreshColorSettingsDesc(which, rgb);
                });
            });
        this.lineAuthorColorSettings.set(which, setting);

        this.refreshColorSettingsName(which);
        this.refreshColorSettingsDesc(
            which,
            pickColor(which, this.settings.lineAuthor)
        );
    }

    private refreshColorSettingsName(which: "oldest" | "newest") {
        const settingsDom = this.lineAuthorColorSettings.get(which);
        if (settingsDom) {
            const whichDescriber =
                which === "oldest"
                    ? `oldest (${this.settings.lineAuthor.coloringMaxAge} or older)`
                    : "newest";
            settingsDom.nameEl.setText(t("Color for {target} commits", { target: whichDescriber }));
        }
    }

    private refreshColorSettingsDesc(which: "oldest" | "newest", rgb?: RGB) {
        const settingsDom = this.lineAuthorColorSettings.get(which);
        if (settingsDom) {
            this.colorSettingPreviewDesc(
                settingsDom.descEl,
                which,
                this.settings.lineAuthor,
                rgb !== undefined
            );
        }
    }

    private colorSettingPreviewDesc(
        descEl: HTMLElement,
        which: "oldest" | "newest",
        laSettings: LineAuthorSettings,
        colorIsValid: boolean
    ): void {
        descEl.empty();
        descEl.createSpan({
            text: "Supports 'rgb(r,g,b)', 'hsl(h,s,l)', hex (#) and named colors (e.g. 'black', 'purple'). Color preview: ",
        });

        const rgbStr = colorIsValid
            ? previewColor(which, laSettings)
            : `rgba(127,127,127,0.3)`;
        const today = moment.unix(moment.now() / 1000).format("YYYY-MM-DD");
        const text = colorIsValid
            ? `abcdef Author Name ${today}`
            : "invalid color";

        descEl.createEl("div", {
            text: text,
            attr: {
                class: "line-author-settings-preview",
                style: `background-color: ${rgbStr}; width: 30ch;`,
            },
        });
    }

    private setCustomDateTimeDescription(
        descEl: HTMLElement,
        dateTimeFormatCustomString: string
    ): void {
        descEl.empty();
        descEl.createEl("a", {
            text: "Format string",
            href: FORMAT_STRING_REFERENCE_URL,
        });
        descEl.createSpan({
            text: " to display the authoring date.",
        });
        descEl.createEl("br");
        const formattedDateTime = moment().format(dateTimeFormatCustomString);
        descEl.createSpan({
            text: `Currently: ${formattedDateTime}`,
        });
    }

    private setOldestAgeDescription(
        descEl: HTMLElement,
        coloringMaxAge: string
    ): void {
        const duration = parseColoringMaxAgeDuration(coloringMaxAge);
        const durationString =
            duration !== undefined ? `${duration.asDays()} days` : "invalid!";
        descEl.empty();
        descEl.createSpan({
            text: `The oldest age in the line author coloring. Everything older will have the same color.\nSmallest valid age is "1d". Currently: ${durationString}`,
        });
    }

    /**
     * Sets the value in the textbox for a given setting only if the saved value differs from the default value.
     * If the saved value is the default value, it probably wasn't defined by the user, so it's better to display it as a placeholder.
     */
    private setNonDefaultValue({
        settingsProperty,
        text,
    }: {
        settingsProperty: keyof ObsidianGitSettings;
        text: TextComponent | TextAreaComponent;
    }): void {
        const storedValue = this.plugin.settings[settingsProperty];
        const defaultValue = DEFAULT_SETTINGS[settingsProperty];

        if (defaultValue !== storedValue) {
            // Doesn't add "" to saved strings
            if (
                typeof storedValue === "string" ||
                typeof storedValue === "number" ||
                typeof storedValue === "boolean"
            ) {
                text.setValue(String(storedValue));
            } else {
                text.setValue(JSON.stringify(storedValue));
            }
        }
    }

    /**
     * Delays the update of the settings UI.
     * Used when the user toggles one of the settings that control enabled states of other settings. Delaying the update
     * allows most of the toggle animation to run, instead of abruptly jumping between enabled/disabled states.
     */
    private refreshDisplayWithDelay(timeout = 80): void {
        window.setTimeout(() => this.display(), timeout);
    }
}

export function pickColor(
    which: "oldest" | "newest",
    las: LineAuthorSettings
): RGB {
    return which === "oldest" ? las.colorOld : las.colorNew;
}

export function parseColoringMaxAgeDuration(
    durationString: string
): moment.Duration | undefined {
    // https://momentjs.com/docs/#/durations/creating/
    const duration = moment.duration("P" + durationString.toUpperCase());
    return duration.isValid() && duration.asDays() && duration.asDays() >= 1
        ? duration
        : undefined;
}

import { t } from "../../i18n";
import { Modal } from "obsidian";
import type ObsidianGit from "src/main";

export class RebaseConflictModal extends Modal {
    constructor(plugin: ObsidianGit) {
        super(plugin.app);
    }

    onOpen(): void {
        const { contentEl, titleEl } = this;
        titleEl.setText(t("Rebase in progress"));
        contentEl.createEl("p", {
            text: t("Git is replaying commits on top of another version. Automatic commits wait until the rebase is finished or aborted. The plugin can help resolve and stage conflicts, but cannot continue or abort a rebase."),
        });

        contentEl.createEl("h3", { text: t("Continue the rebase") });
        contentEl.createEl("p", {
            text: t("Resolve each conflicted file and select the plus icon to stage it. Then open a terminal in the repository and run:"),
        });
        contentEl.createEl("pre").createEl("code", {
            text: "git rebase --continue",
        });
        contentEl.createEl("p", {
            text: t("Repeat if Git stops at another conflict. Use rebase --continue rather than a normal commit to finish the rebase."),
        });

        contentEl.createEl("h3", { text: t("Abort the rebase") });
        contentEl.createEl("p", {
            text: t("To cancel the rebase and return to the original branch state, run in the same terminal:"),
        });
        contentEl.createEl("pre").createEl("code", {
            text: "git rebase --abort",
        });
        contentEl.createEl("p", {
            text: t("Refresh Source Control after continuing or aborting to update the repository status."),
        });

        const buttons = contentEl.createDiv({ cls: "modal-button-container" });
        const close = buttons.createEl("button", {
            cls: "mod-cta",
            text: t("Got it"),
        });
        close.addEventListener("click", () => this.close());
    }

    onClose(): void {
        this.contentEl.empty();
    }
}

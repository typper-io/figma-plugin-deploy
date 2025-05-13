import * as core from "@actions/core";
import { FigmaPublishFlow } from "./figma-plugin-publish";

async function run(): Promise<void> {
  try {
    const pluginId = core.getInput("plugin-id");
    const releaseNotes = core.getInput("release-notes");
    const teamId = core.getInput("team-id");

    new FigmaPublishFlow({
      pluginId,
      releaseNotes,
      teamId,
    }).publish();
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    }
  }
}

run();

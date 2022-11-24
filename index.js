const core = require("@actions/core");
const github = require("@actions/github");
const dayjs = require("dayjs");
const weekOfYear = require("dayjs/plugin/weekOfYear");
dayjs.extend(weekOfYear);
require("dayjs/locale/nl");
dayjs.locale("nl");

async function run() {
  try {
    const token = core.getInput("token");
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;

    const latestRelease = await octokit.rest.repos.getLatestRelease({
      owner,
      repo
    });
    if (latestRelease.status !== 200) {
      core.setFailed(
        `Failed to get latest release (status=${latestRelease.status})`
      );
      return;
    }

    const currentTag = latestRelease.data.tag_name || createTag();

    await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: updateTag(currentTag),
      body: ""
    });

    core.info(`Created Released \x1b[32m${inputVersion || " - "}\x1b[0m`);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

function createTag() {
  const now = dayjs();
  return `${now.year()}.${now.week()}.1`;
}

function updateTag(tag) {
  const splittedTag = tag.split(".");
  // Invalid tag
  if (splittedTag.length !== 3) {
    return createTag();
  }

  const now = dayjs();
  const year = now.year();
  const week = now.week();

  if (
    week.toString() !== splittedTag[1] ||
    year.toString() !== splittedTag[0]
  ) {
    return createTag();
  }

  const hotfix = parseInt(splittedTag[2]);
  return `${splittedTag[0]}.${splittedTag[1]}.${hotfix + 1}`;
}

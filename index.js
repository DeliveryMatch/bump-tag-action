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
    try {
      const latestRelease = await octokit.rest.repos.getLatestRelease({
        owner,
        repo
      });
      core.info(JSON.stringify(latestRelease));
      if (latestRelease.status !== 200) {
        core.setFailed(
          `Failed to get latest release (status=${latestRelease.status})`
        );
        return;
      }
      const currentTag = latestRelease.data.tag_name || createTag();
      core.info(latestRelease.data.tag_name);
      let newTag = updateTag(currentTag);
      core.info(newTag);
      await octokit.rest.repos.createRelease({
        owner,
        repo,
        tag_name: newTag,
        body: ""
      });
    } catch {
      await octokit.rest.repos.createRelease({
        owner,
        repo,
        tag_name: createTag(),
        body: ""
      });
    }
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
  const versionNumber = tag.split(":");
  const splittedTag = versionNumber[0].split(".");
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

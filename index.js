const core = require("@actions/core");
const github = require("@actions/github");
const { exec } = require("child_process");
const dayjs = require("dayjs");
const weekOfYear = require("dayjs/plugin/weekOfYear");
dayjs.extend(weekOfYear);
require("dayjs/locale/nl");
dayjs.locale("nl");

async function run() {
  try {
    exec(
      `git for-each-ref --sort=-creatordate --count 1 --format="%(refname:short)" "refs/tags/*"`,
      async (err, tag, stderr) => {
        const token = core.getInput("gh-token");
        const oktokit = github.getOctokit(token);
        let newTag;

        if (!tag) {
          newTag = createTag();
        } else {
          newTag = createTag();
        }
        core.setOutput("tag", newTag);

        core.startGroup("Generating tag");
        core.info(`current tag: ${tag}`);
        core.info(`new tag: ${newTag}`);
        core.endGroup();
        const response = await oktokit.rest.git.createTag({
          ...github.context.repo,
          tag: newTag,
          message: `New version: ${newTag}`,
          object: github.context.sha,
          type: "commit"
        });

        if (response.status !== 201) {
          core.setFailed(
            `Failed to create tag object (status=${response.status})`
          );
          return;
        }
        core.startGroup(
          `CreateTag Result Data (${github.context.repo.owner}/${
            github.context.repo.repo
          }): \x1b[33m${response.status || "-"}\x1b[0m `
        );
        core.info(`${JSON.stringify(response, null, 2)}`);
        core.endGroup();
        const ref_rsp = await octokit.rest.git.createRef({
          ...github.context.repo,
          ref: `refs/tags/${newTag}`,
          sha: response.data.sha
        });
        if (response.status !== 201) {
          core.setFailed(
            `Failed to create tag ref(status = ${response.status})`
          );
          return;
        }
        core.startGroup(
          `CreateRef Result Data: \x1b[33m${response.status || "-"}\x1b[0m `
        );
        core.info(`${JSON.stringify(response, null, 2)}`);
        core.endGroup();
        return response.data.sha;
      }
    );
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

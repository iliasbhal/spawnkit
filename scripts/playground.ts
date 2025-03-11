import { Octokit } from '@octokit/rest';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as path from 'path';
import pLimit from 'p-limit';
import { PrismaClient } from '@prisma/client';

dotenv.config();

interface ExportProgress {
  organization: string;
  repositories: {
    [repoName: string]: {
      commits: string | null;
      pullRequests: number | null;
      issues: number | null;
      completed: boolean;
    };
  };
}

async function paginateGithubApi<T>(
  fetcher: (params: any) => Promise<T[]>,
  params: any,
  limit: pLimit.Limit,
  sinceKey?: { key: string; value: any }
): Promise<T[]> {
  return limit(() =>
    fetcher({
      per_page: 100,
      ...(sinceKey && { [sinceKey.key]: sinceKey.value }),
      ...params,
    })
  );
}

interface GithubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
  author?: {
    login: string;
  };
}

interface GithubIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  user: {
    login: string;
  };
  created_at: string;
  closed_at: string | null;
  pull_request?: {
    merged_at: string | null;
    merged_by?: {
      login: string;
    };
    mergeable: boolean;
    merged: boolean;
    draft: boolean;
    base: {
      ref: string;
    };
    head: {
      ref: string;
    };
  };
}

interface GithubReaction {
  content: string;
  user: {
    login: string;
  };
  created_at: string;
}

async function exportRepository(
  repo: string,
  orgName: string,
  octokit: Octokit,
  progress: ExportProgress,
  prisma: PrismaClient,
  progressFile: string,
  limit: pLimit.Limit
) {
  const repoName = repo;

  if (!progress.repositories[repoName]) {
    progress.repositories[repoName] = {
      commits: null,
      pullRequests: null,
      issues: null,
      completed: false,
    };
  }

  if (!progress.repositories[repoName].completed) {
    try {
      // Get or create repository
      const repository = await prisma.repository.upsert({
        where: {
          name_orgName: {
            name: repoName,
            orgName: orgName,
          },
        },
        create: {
          name: repoName,
          orgName: orgName,
        },
        update: {},
      });

      // Run commits, PRs, and issues exports in parallel
      const [commits, prs, issues] = await Promise.all([
        paginateGithubApi<GithubCommit>(
          (params) => octokit.paginate(octokit.repos.listCommits, params),
          { owner: orgName, repo: repoName },
          limit,
          progress.repositories[repoName].commits
            ? { key: 'since', value: progress.repositories[repoName].commits }
            : undefined
        ),
        paginateGithubApi<GithubIssue>(
          (params) => octokit.paginate(octokit.pulls.list, params),
          {
            owner: orgName,
            repo: repoName,
            state: 'all',
            headers: {
              accept: 'application/vnd.github.v3+json'
            }
          },
          limit,
          progress.repositories[repoName].pullRequests
            ? { key: 'since', value: progress.repositories[repoName].pullRequests }
            : undefined
        ),
        paginateGithubApi<GithubIssue>(
          (params) => octokit.paginate(octokit.issues.listForRepo, params),
          {
            owner: orgName,
            repo: repoName,
            state: 'all',
            headers: {
              accept: 'application/vnd.github.v3+json'
            }
          },
          limit,
          progress.repositories[repoName].issues
            ? { key: 'since', value: progress.repositories[repoName].issues }
            : undefined
        ),
      ]);

      // Insert data in transaction
      await prisma.$transaction(async (tx) => {
        // Insert commits
        await Promise.all(
          commits.map((commit) =>
            tx.commit.upsert({
              where: { sha: commit.sha },
              create: {
                sha: commit.sha,
                repositoryId: repository.id,
                author: commit.author?.login || commit.commit.author?.name,
                message: commit.commit.message,
                committedAt: new Date(commit.commit.author.date),
              },
              update: {},
            })
          )
        );

        // Insert issues
        await Promise.all(
          issues
            .filter(item => !item.pull_request) // Ensure we only process actual issues
            .map((item) =>
              tx.issue.upsert({
                where: { githubId: item.id },
                create: {
                  githubId: item.id,
                  repositoryId: repository.id,
                  number: item.number,
                  title: item.title,
                  state: item.state,
                  author: item.user?.login,
                  createdAt: new Date(item.created_at),
                  closedAt: item.closed_at ? new Date(item.closed_at) : null,
                },
                update: {
                  state: item.state,
                  closedAt: item.closed_at ? new Date(item.closed_at) : null,
                },
              })
            )
        );

        // Insert pull requests
        await Promise.all(
          prs.map((pr) =>
            tx.pullRequest.upsert({
              where: { githubId: pr.id },
              create: {
                githubId: pr.id,
                repositoryId: repository.id,
                number: pr.number,
                title: pr.title,
                state: pr.state,
                author: pr.user?.login,
                createdAt: new Date(pr.created_at),
                closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
                mergeable: pr.pull_request?.mergeable ?? null,
                merged: pr.pull_request?.merged ?? null,
                mergedAt: pr.pull_request?.merged_at ? new Date(pr.pull_request.merged_at) : null,
                mergedBy: pr.pull_request?.merged_by?.login ?? null,
                draft: pr.pull_request?.draft ?? null,
                base: pr.pull_request?.base?.ref ?? null,
                head: pr.pull_request?.head?.ref ?? null,
              },
              update: {
                state: pr.state,
                closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
                mergeable: pr.pull_request?.mergeable ?? null,
                merged: pr.pull_request?.merged ?? null,
                mergedAt: pr.pull_request?.merged_at ? new Date(pr.pull_request.merged_at) : null,
                mergedBy: pr.pull_request?.merged_by?.login ?? null,
                draft: pr.pull_request?.draft ?? null,
              },
            })
          )
        );
      });

      // Update progress
      progress.repositories[repoName].commits = commits[commits.length - 1]?.sha || null;
      progress.repositories[repoName].pullRequests = prs[prs.length - 1]?.number || null;
      progress.repositories[repoName].issues = issues[issues.length - 1]?.number || null;

      // Export reactions in parallel
      const items = [...issues, ...prs];
      const reactionPromises = items.map((item) =>
        paginateGithubApi<GithubReaction>(
          (params) => octokit.paginate(octokit.reactions.listForIssue, params),
          {
            owner: orgName,
            repo: repoName,
            issue_number: item.number,
          },
          limit
        )
      );

      const reactions = await Promise.all(reactionPromises);

      // Insert reactions
      await prisma.$transaction(async (tx) => {
        await Promise.all(
          reactions.flat().map(async (reaction, idx) => {
            const item = items[Math.floor(idx / 100)];
            const isPullRequest = !!item.pull_request;

            if (isPullRequest) {
              const pr = await tx.pullRequest.findUnique({
                where: { githubId: item.id },
              });
              if (pr) {
                await tx.reaction.create({
                  data: {
                    pullRequestId: pr.id,
                    content: reaction.content,
                    user: reaction.user?.login,
                    createdAt: new Date(reaction.created_at),
                  },
                });
              }
            } else {
              const issue = await tx.issue.findUnique({
                where: { githubId: item.id },
              });
              if (issue) {
                await tx.reaction.create({
                  data: {
                    issueId: issue.id,
                    content: reaction.content,
                    user: reaction.user?.login,
                    createdAt: new Date(reaction.created_at),
                  },
                });
              }
            }
          })
        );
      });

      progress.repositories[repoName].completed = true;
      await fs.writeJSON(progressFile, progress, { spaces: 2 });

      console.log(`Completed export for ${repoName}`);
    } catch (error) {
      console.error(`Error exporting ${repoName}:`, error);
      await fs.writeJSON(progressFile, progress, { spaces: 2 });
    }
  }
}

export const main = async () => {
  const orgName = process.env.GITHUB_ORG!;
  const token = process.env.GITHUB_TOKEN!;
  const maxConcurrent = parseInt(process.env.GITHUB_MAX_CONCURRENT || '5', 10);

  if (!orgName || !token) {
    throw new Error('Please set GITHUB_ORG and GITHUB_TOKEN environment variables');
  }

  const octokit = new Octokit({ auth: token });
  const progressFile = path.join(process.cwd(), 'export-progress.json');
  const prisma = new PrismaClient();

  // Create a concurrency limit
  const limit = pLimit(maxConcurrent);

  // Initialize or load progress
  let progress: ExportProgress = {
    organization: orgName,
    repositories: {},
  };

  if (await fs.pathExists(progressFile)) {
    progress = await fs.readJSON(progressFile);
  }

  try {
    // Get all repositories in the organization
    const repos = await paginateGithubApi(
      (params) => octokit.paginate(octokit.repos.listForOrg, params),
      { org: orgName },
      limit
    );

    // Process repositories in parallel with concurrency limit
    const exportPromises = repos.map((repo: any) =>
      exportRepository(
        repo.name,
        orgName,
        octokit,
        progress,
        prisma,
        progressFile,
        limit
      )
    );

    await Promise.all(exportPromises);
    console.log('Export completed successfully!');
  } finally {
    // Disconnect from the database
    await prisma.$disconnect();
  }
};

// Handle interruptions
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT. Saving progress...');
  process.exit(0);
});

if (require.main === module) {
  main().catch(console.error);
}
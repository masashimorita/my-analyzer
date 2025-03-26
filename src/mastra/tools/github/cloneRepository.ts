import { createTool } from "@mastra/core";
import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);


export const cloneOutputSchema = z.object({
  success: z.boolean().describe("Successfully cloned or not"),
  message: z.string().describe("Result message"),
  repositoryFullPath: z.string().optional().describe("Cloned repository full path"),
  cloneDirectoryName: z.string().optional().describe("Cloned directory name (relative)"),
}).describe("Result of repository manipulation");

export const cloneRepositoryTool = createTool({
  id: 'clone-repository',
  description: "Clone Github repository to be available for code analysis and file processing",
  inputSchema: z.object({
    repositoryUrl: z.string().describe("Repository URL (e.g. https://github.com/user/repo) - Specify Github repository to clone"),
    branch: z.string().optional().describe('Breanch to checkout. If you don\'t specify, it would be default branch.'),
    includeLfs: z.boolean().optional().default(false).describe('True / False to retrieve file with Git LFS'),
    includeSubmodules: z.boolean().optional().default(false).describe('True / False to retrieve submodules')
  }),
  outputSchema: cloneOutputSchema,
  execute: async ({ context }) => {
    const { repositoryUrl, branch, includeLfs, includeSubmodules } = context;

    try {
      const repoName = repositoryUrl.split("/").pop()?.replace(".git", "") || "repo";
      const cloneDir = repoName;
      const fullPath = path.resolve(process.cwd(), cloneDir);

      if (fs.existsSync(fullPath)) {
        return {
          success: true,
          message: `Skip cloning repository due to directory ${cloneDir} exist`,
          repositoryFullPath: fullPath,
          cloneDirectoryName: cloneDir,
        };
      }

      let command = `git clone ${repositoryUrl}`;
      if (branch) {
        command += ` -b ${branch}`;
      }
      if (includeSubmodules) {
        command += ` --recurse-submodules`;
      }

      command += ` ${cloneDir}`;

      const { stdout, stderr } = await execAsync(command);

      if (includeLfs) {
        try {
          await execAsync(`cd ${cloneDir} && git lfs pull`);
        } catch (err: any) {
          return {
            success: true,
            message: `Successfully cloned repository, but failed to retrieve LFS files: ${err.message}`,
            repositoryFullPath: fullPath,
            cloneDirectoryName: cloneDir,
          };
        }
      }

      return {
        success: true,
        message: `Successfully cloned repository to ${fullPath}`,
        repositoryFullPath: fullPath,
        cloneDirectoryName: cloneDir,
      };
    } catch (err: any) {
      console.error(err);
      console.error(`Debug Info: URL=${repositoryUrl}, Branch=${branch || "default"}`);
      
      const dummyCloneDir = "repo";
      const dummyFullPath = path.resolve(process.cwd(), dummyCloneDir);

      return {
        success: false,
        message: `Failed to clone repository: ${err.message}`,
        repositoryFullPath: dummyFullPath,
        cloneDirectoryName: dummyCloneDir,
      };
    }
  }
});

import { ReplaceResult } from 'replace-in-file';
import simpleGit from 'simple-git';
import path from 'node:path';
import fs from 'node:fs';

export const git = simpleGit()

export function commitReplacedResults(operationName: string): (results: ReplaceResult[]) => ReplaceResult[] | Promise<ReplaceResult[]> {
    return (results) => {
        console.log(operationName);

        const changedFiles = results.filter(result => result.hasChanged)
        if (changedFiles.length > 0) {
            let simpleGit = git;
            changedFiles.forEach(
                changedFile => {
                    console.log(` - ${changedFile.file} 修改完成`)
                    simpleGit = simpleGit.add(changedFile.file)
                }
            );
            let commitMessage = `${operationName}。`;
            return simpleGit.commit(commitMessage)
                .then(result => {
                    console.log(` - 將以上 ${changedFiles.length} 個檔案的異動 commit 完成`)
                    return changedFiles
                })

        } else {
            console.log(` - 沒有檔案需要異動`)
        }
        return changedFiles;
    }
}

export function deleteFilesAndCommit(operationName: string): (filesToBeDeleted: string[]) => Promise<string[]> {
    return (filesToBeDeleted) => {
        console.log(operationName)

        if (filesToBeDeleted.length > 0) {
            let simpleGit = git;
            filesToBeDeleted.forEach(
                fileToBeDeleted => {
                    console.log(` - 將 ${fileToBeDeleted} 標記為刪除`)
                    simpleGit = simpleGit.rm(fileToBeDeleted)
                }
            );
            let commitMessage = `${operationName}。`;
            return simpleGit.commit(commitMessage)
                .then(result => {
                    console.log(` - 將刪除以上 ${filesToBeDeleted.length} 個檔案的異動 commit 完成`)
                    return filesToBeDeleted
                })

        } else {
            console.log(` - 沒有檔案需要刪除`)
        }

        return Promise.resolve(filesToBeDeleted)
    }
}

export type FileMove = {
    from: string,
    to: string,
}

export function moveFilesAndCommit(operationName: string): (files: FileMove[]) => Promise<FileMove[]> {
    return (files) => {
        console.log(operationName)

        if (files.length > 0) {
            let simpleGit = git;
            files.forEach(
                file => {
                    let targetPath = file.to.substring(0, file.to.lastIndexOf(path.sep))
                    try {
                        fs.accessSync(targetPath)
                    } catch (e) {
                       fs.mkdirSync(targetPath)
                    }
                    console.log(` - 將 ${file.from} 更名為 ${file.to}`)
                    simpleGit = simpleGit.mv(file.from, file.to)
                }
            );
            let commitMessage = `${operationName}。`;
            return simpleGit.commit(commitMessage)
                .then(result => {
                    console.log(` - 將以上 ${files.length} 個檔案的更名異動 commit 完成`)
                    return files
                })

        } else {
            console.log(` - 沒有檔案需要搬移`)
        }

        return Promise.resolve(files)
    }
}

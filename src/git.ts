import { ReplaceResult } from 'replace-in-file';
import simpleGit from 'simple-git';

export const git = simpleGit()

export function commitReplacedResults(operationName: string, results: ReplaceResult[]): ReplaceResult[] | Promise<ReplaceResult[]> {
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

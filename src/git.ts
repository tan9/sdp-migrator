import replaceInFilePkg, { ReplaceInFileConfig, ReplaceResult } from 'replace-in-file';
import simpleGit from 'simple-git';

export const git = simpleGit()

const { replaceInFile } = replaceInFilePkg

export function replaceInFileAndCommit(operationName: string, config: ReplaceInFileConfig): Promise<ReplaceResult[]> {
    return replaceInFile(config)
        .then(results => {
            const touchedFiles = results.filter(result => result.hasChanged)
            if (touchedFiles.length > 0) {
                console.log(operationName);
                let simpleGit = git;
                touchedFiles.forEach(
                    touchedFile => {
                        console.log(` - ${touchedFile.file} 修改完成`)
                        simpleGit = simpleGit.add(touchedFile.file)
                    }
                );
                return simpleGit.commit(operationName)
                    .then(result => {
                        console.log(' - 將以上異動 commit 完成')
                        return touchedFiles
                    })
            }
            return touchedFiles;
        })
}

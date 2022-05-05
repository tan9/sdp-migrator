import fs from 'node:fs';
import path from 'node:path';
import { replaceInFile } from 'replace-in-file';
import simpleGit from 'simple-git';
import figlet from 'figlet';

// 列印 banner
console.log(
    figlet.textSync('SDP Migrator') + '\n'
)

const git = simpleGit()

const PROJECT_ERROR = 1;
const GIT_ERROR = 2;
const MIGRATE_ERROR = 3;

const pwd = path.resolve();

// 確認是在專案目錄下執行
if (!fs.existsSync('./pom.xml')) {
    console.warn(`${pwd} 目錄下沒有 pom.xml，請切換到專案目錄下再試一次。`)
    process.exit(PROJECT_ERROR)
}

// 確認專案在 git 管控，而且沒有什麼髒東西
git.checkIsRepo()
    .then(isRepo => {
        if (!isRepo) {
            console.log("路徑不在 git 版控中，無法進行升版。")
            process.exit(GIT_ERROR)
        }
    })

git.status()
    .then(status => {
        if (!status.isClean()) {
            console.log("git 目錄中有未 commit 的異動，請確認所有異動都已儲存後再試一次。")
            process.exit(GIT_ERROR);
        }
    })

// 更新 Parent POM 版本
replaceInFile({
    files: '**/pom.xml',
    from: /(<parent>.*<artifactId>fdc<\/artifactId>.*)<version>2.0.0<\/version>/s,
    to: '$1<version>3.0.0-SNAPSHOT</version>',
}).then(results => {
    let replacedFiles = results.filter(result => result.hasChanged);
    if (replacedFiles.length > 0) {
        console.log("Parent POM 版本已更新為 3.0.0-SNAPSHOT。");
        replacedFiles.forEach(
            replacedFile => {
                git.add(replacedFile.file)
            }
        )
        git.commit("Upgrade SDP parent to 3.0.0-SNAPSHOT.")
    }
}).catch(error => {
    console.error('更新 parent POM 版本時發生錯誤:', error);
    process.exit(MIGRATE_ERROR);
});

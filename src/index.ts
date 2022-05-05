import * as fs from 'fs';
import { replaceInFile } from 'replace-in-file';
import simpleGit from 'simple-git';

const git = simpleGit()

// 確認是在專案目錄下執行
if (!fs.existsSync('./pom.xml')) {
    console.warn('pom.xml 不存在，請切換到專案目錄下再執行本程式。')
    process.exit(1)

}

// 確認專案在 git 管控，而且沒有什麼髒東西
git.checkIsRepo()
    .then(isRepo => {
        if (!isRepo) {
            console.log("路徑不在 git 版控中，無法進行升版。")
            process.exit(2);
        }
    })

git.status()
    .then(status => {
        if (!status.isClean()) {
            console.log("git 目錄中有未 commit 的異動，請確認所有異動都已儲存後再試一次。")
            process.exit(2);
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
    process.exit(3);
});

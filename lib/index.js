import fs from 'node:fs';
import path from 'node:path';
import figlet from 'figlet';
import { exit } from './exception.js';
import { git, replaceInFileAndCommit } from './git.js';
import { GIT_ERROR, MIGRATE_ERROR, PROJECT_ERROR } from './constants.js';
// 列印 banner
console.log(figlet.textSync('SDP Migrator') + '\n');
const pwd = path.resolve();
// 確認是在專案目錄下執行
if (!fs.existsSync('./pom.xml')) {
    exit(PROJECT_ERROR, `${pwd} 目錄下沒有 pom.xml，請切換到專案目錄下再試一次。`);
}
// 確認專案在 git 管控，而且沒有什麼髒東西
git.checkIsRepo()
    .then((isRepo) => {
    if (!isRepo) {
        exit(GIT_ERROR, '路徑不在 git 版控中，無法進行升版。');
    }
});
git.status()
    .then(status => {
    if (!status.isClean()) {
        console.log('git 目錄中有未 commit 的異動，請確認所有異動都已儲存後再試一次。');
        console.log('\n末儲存變更的檔案如下:');
        console.debug(status.files.map(file => file.path));
        exit(GIT_ERROR);
    }
});
// 更新 Parent POM 版本
await replaceInFileAndCommit('將 Parent POM 更新為 3.0.0-SNAPSHOT。', {
    files: '**/pom.xml',
    from: /(<parent>.*<artifactId>fdc<\/artifactId>.*)<version>2.0.0<\/version>/s,
    to: '$1<version>3.0.0-SNAPSHOT</version>',
}).catch(error => {
    exit(MIGRATE_ERROR, `更新 parent POM 版本時發生錯誤: ${error}`);
});
// 修改 build 設定
await replaceInFileAndCommit('移除 build.outputDirectory 設定。', {
    files: '**/pom.xml',
    from: /^.*<outputDirectory>src\/main\/webapp\/WEB-INF\/classes<\/outputDirectory>.*$\n/m,
    to: '',
}).catch(error => {
    exit(MIGRATE_ERROR, `移除 build.outputDirectory 設定時發生錯誤: ${error}`);
});

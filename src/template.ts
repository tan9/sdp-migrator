import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'url';

export function renderFile(templatePath: string, data?: ejs.Data | undefined): Promise<string> {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    return ejs.renderFile(path.resolve(dirname, '..') + '/' + templatePath, data)
}

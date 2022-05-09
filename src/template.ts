import ejs from 'ejs';
import path from 'node:path';
import { fileURLToPath } from 'url';

export function renderFile(templatePath: string, data?: ejs.Data | undefined): Promise<string> {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return ejs.renderFile(path.resolve(__dirname, '..') + '/' + templatePath, data)
}

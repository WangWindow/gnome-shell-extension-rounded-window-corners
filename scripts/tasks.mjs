import {
    cpSync,
    mkdirSync,
    readdirSync,
    rmSync,
} from 'node:fs';
import {homedir} from 'node:os';
import {dirname, extname, join, relative, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const buildDir = join(root, '_build');
const uuid = 'rounded-window-corners@choco2233';
const chineseCatalog = join(root, 'po', 'zh_CN.po');
const template = join(buildDir, `${uuid}.pot`);

function run(command, args, cwd = root) {
    const result = spawnSync(command, args, {cwd, stdio: 'inherit'});

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(`${command} exited with status ${result.status}`);
    }
}

function copyTree(source, destination, shouldCopy = () => true) {
    mkdirSync(destination, {recursive: true});

    for (const entry of readdirSync(source, {withFileTypes: true})) {
        const sourcePath = join(source, entry.name);
        const destinationPath = join(destination, entry.name);

        if (entry.isDirectory()) {
            copyTree(sourcePath, destinationPath, shouldCopy);
        } else if (entry.isFile() && shouldCopy(sourcePath)) {
            cpSync(sourcePath, destinationPath);
        }
    }
}

function listFiles(directory, extension) {
    const files = [];

    for (const entry of readdirSync(directory, {withFileTypes: true})) {
        const path = join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...listFiles(path, extension));
        } else if (entry.isFile() && extname(entry.name) === extension) {
            files.push(relative(root, path));
        }
    }

    return files.sort();
}

function clean() {
    rmSync(buildDir, {recursive: true, force: true});
    rmSync(join(root, `${uuid}.shell-extension.zip`), {force: true});
}

function build() {
    rmSync(buildDir, {recursive: true, force: true});

    run(process.execPath, [
        join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
        '--project',
        'tsconfig.json',
        '--outDir',
        '_build',
    ]);

    copyTree(join(root, 'resources'), buildDir);
    copyTree(
        join(root, 'src'),
        buildDir,
        path => !['.ts', '.md'].includes(extname(path)),
    );

    run('glib-compile-schemas', [join(buildDir, 'schemas')]);

    const localeDir = join(buildDir, 'locale', 'zh_CN', 'LC_MESSAGES');
    mkdirSync(localeDir, {recursive: true});
    run('msgfmt', [
        '--output-file',
        join(localeDir, `${uuid}.mo`),
        chineseCatalog,
    ]);
}

function install() {
    build();

    const dataHome = process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share');
    const extensionDir = join(dataHome, 'gnome-shell', 'extensions', uuid);
    rmSync(extensionDir, {recursive: true, force: true});
    mkdirSync(dirname(extensionDir), {recursive: true});
    cpSync(buildDir, extensionDir, {recursive: true});
}

function pack() {
    build();

    const archive = join(root, `${uuid}.shell-extension.zip`);
    rmSync(archive, {force: true});
    run('zip', ['-9r', archive, '.'], buildDir);
}

function updateTranslations() {
    const uiFiles = listFiles(join(root, 'src'), '.ui');
    const tsFiles = listFiles(join(root, 'src'), '.ts');
    mkdirSync(buildDir, {recursive: true});

    run('xgettext', [
        '--from-code=UTF-8',
        `--output=${template}`,
        ...uiFiles,
    ]);
    run('xgettext', [
        '--from-code=UTF-8',
        '--language=JavaScript',
        '--join-existing',
        `--output=${template}`,
        ...tsFiles,
    ]);
    run('msgmerge', [
        '--quiet',
        '--update',
        '--backup=off',
        chineseCatalog,
        template,
    ]);
}

const task = process.argv[2];

switch (task) {
    case 'build':
        build();
        break;
    case 'clean':
        clean();
        break;
    case 'install':
        install();
        break;
    case 'pack':
        pack();
        break;
    case 'update-translations':
        updateTranslations();
        break;
    default:
        throw new Error(`Unknown task: ${task ?? ''}.`);
}

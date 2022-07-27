#! /usr/bin/env node

const fs = require('fs');
const path = require('path');
const packageFolder = __dirname;

let lang = Intl.DateTimeFormat().resolvedOptions().locale;
lang = (lang === 'pt-BR' || lang === 'en-US')
  ? lang
  : 'en-US';

function getLanguage(extra = '') {
  return require(
    path.join(packageFolder, `locales/${extra}${lang}.json`)
  );
}
// locales object
const i18n = getLanguage();
const i18nTemplate = getLanguage('template/');

// Modules object
const Nulla = {};

Nulla.getFiles = function (directory, Files) {

  fs.readdirSync(directory).forEach(file => {
    const absolute = path.join(directory, file);

    if (fs.statSync(absolute).isDirectory()) {
      return Nulla.getFiles(absolute, Files);
    } else {
      const isImage = absolute.includes('public') ? 'images' : 'files';
      const pathToTemplates = path.relative(
        path.join(packageFolder, "template"),
        absolute
      );

      return Files[isImage].push(pathToTemplates);
    }
  });

};

const Files = { images: [], files: [] };
Nulla.getFiles(path.join(packageFolder, "template"), Files);

Nulla.contentReplacer = (content, name, value, mainName) => {
  mainName = mainName || 'PROJECT';
  return content.replace(new RegExp(`{{${mainName}_${name}}}`, 'g'), value);
};

const replaceLangs = (content) => {
  const i18nReplacer = (name, value) => {
    content = Nulla.contentReplacer(content, name, value, 'i18n');
  };

  Object.entries(i18nTemplate).forEach(v => {
    if (v[0] === 'links') {
      return v[1].forEach((link, i) => {
        i18nReplacer(`link${i}:0`, link[0]);
        i18nReplacer(`link${i}:1`, link[1]);
      });
    }
    if (v[0] === 'nulla') {
      i18nReplacer('nulla.link', v[1].link);
      i18nReplacer(`nulla.altImage`, v[1].altImage);
      return;
    }
    i18nReplacer(v[0], v[1]);
  });

  return content;
};

Nulla.addToPackage = (projectPath, field, property, value) => {
  const packageJson = require(path.join(projectPath, 'package.json'));
  packageJson[field] = packageJson[field] || {};
  packageJson[field][property] = value;
  fs.writeFileSync(path.join(projectPath, 'package.json'), JSON.stringify(packageJson, null, 2));
}

Nulla.run = (names, {isTS, isTW}) => {
  const { projectSlug, projectName } = names;
  const projectPath = path.join(process.cwd(), projectSlug);
  const fileExt = isTS ? 'tsx' : 'jsx';

  fs.mkdirSync(projectPath);
  fs.mkdirSync(`${projectPath}/src`);
  fs.mkdirSync(`${projectPath}/public`);

  const srcFolder = 'vscode://file/' + (
    path.join(process.cwd(), `${projectSlug}/src`)
      .replace(/[\\]/g, '/')
  );

  for (const file of Files.files) {
    if (file.match(new RegExp(`.${isTS ? 'jsx' : 'tsx'}$`))) continue;
    if (!isTS && /tsconfig.json/.test(file)) continue;
    if (!isTW && /tailwind.config.js/.test(file)) continue;
    let content = fs.readFileSync(
      path.join(packageFolder, "template", file),
      'utf8'
    );
    content = Nulla.contentReplacer(content, 'NAME', projectName);
    content = Nulla.contentReplacer(content, 'SLUG', projectSlug);
    content = Nulla.contentReplacer(content, 'EXTENSION', fileExt);
    const target = path.join(projectPath, file.replace('_', '.'));
    content = Nulla.contentReplacer(content, 'SRC', srcFolder);
    content = Nulla.contentReplacer(content, 'LANG', lang);
    content = replaceLangs(content);
    fs.writeFileSync(target, content);
  }

  if(isTW) {
    Nulla.addToPackage(projectPath, 'devDependencies', 'tailwindcss', '^3.1');
    Nulla.addToPackage(projectPath, 'scripts', 'tailwind', 'npx tailwindcss -i src/Application.css -o src/tailwind.css');
    Nulla.addToPackage(projectPath, 'scripts', 'tailwind-watch', 'npx tailwindcss -i src/Application.css -o src/tailwind.css --watch');
    
    let content = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n`
    content += fs.readFileSync(
      path.join(projectPath, "src", 'Application.css'),
      'utf8'
    );
    fs.writeFileSync(path.join(projectPath, "src", 'Application.css'), content);

    content = fs.readFileSync(
      path.join(projectPath, "src", `Application.${fileExt}`),
      'utf8'
    );

    content = content.replace(`import './Application.css';`, `import './Application.css';\nimport './tailwind.css';`);
    fs.writeFileSync(path.join(projectPath, "src", `Application.${fileExt}`), content);
  }

  for (const image of Files.images) {
    let destName = image;
    if (image.match(new RegExp(`nulla(?!.*${lang})`))) continue;
    if (image.match(/nulla-chan/)) {
      destName = path.join(image, '../nulla-chan.webp');
    }
    fs.copyFileSync(
      path.join(packageFolder, "template", image),
      path.join(projectPath, destName)
    );
  }

  console.log(i18n.success.isReady.replace('{projectName}', projectName));
  console.log('\x1b[36m%s\x1b[0m', `cd ${projectSlug}`);
  console.log('\x1b[36m%s\x1b[0m', `npm install`);
  console.log(i18n.success.openEditor);
  console.log('\x1b[36m%s\x1b[0m', `npm start`);
};

Nulla.testName = (name) => {
  const isValid = !!name.match(new RegExp("^(?:@[a-z0-9-*~][a-z0-9-*._~]*/)?[a-z0-9-~][a-z0-9-._~]*$", 'g'));

  if (!isValid) {
    console.log(i18n.error.unvalidName);
    process.exit(0);
  }
  return isValid;
};

Nulla.storeNames = (name) => {
  const argName = name
    .split(' ')
    .filter(c => c.trim())
    .join(' ');

  const projectSlug = argName
    .replace(/[\s]/g, '-')
    .toLowerCase();
  Nulla.testName(projectSlug);

  const projectName = projectSlug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return { argName, projectSlug, projectName };
};

Nulla.errorHandler = (e) => {
  if (e.code === 'EEXIST') {
    console.log(i18n.error.alreadyExists);
  } else {
    console.log(i18n.error.default, e);
  }
};

Nulla.tryRun = (rl, name, opts) => {
  try {
    rl.close();
    const names = Nulla.storeNames(name);
    Nulla.run(names, opts);
  } catch (e) {
    Nulla.errorHandler(e);
  }
};

Nulla.isTS = (args) => {
  const tsIdx = args.includes('-ts')
    ? args.indexOf('-ts')
    : args.indexOf('--typescript');
  if (tsIdx > -1) {
    args.splice(tsIdx, 1);
    return true;
  }
  return false;
};

Nulla.isTW = (args) => {
  const tsIdx = args.indexOf('--tailwind');
  if(tsIdx > -1) {
    args.splice(tsIdx, 1);
    return true;
  }
  return false;
}

module.exports = { Nulla, i18n };

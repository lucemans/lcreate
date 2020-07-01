import { readKeypress } from 'https://deno.land/x/keypress@0.0.4/mod.ts';
import { exists, existsSync } from 'https://deno.land/std/fs/mod.ts';
import { exec, OutputMode } from "https://deno.land/x/exec/mod.ts";
import Kia from "https://deno.land/x/kia@0.3.0/mod.ts";

enum Color {
    Reset = '\x1b[0m',
    Bright = '\x1b[1m',
    Dim = '\x1b[2m',
    Underscore = '\x1b[4m',
    Blink = '\x1b[5m',
    Reverse = '\x1b[7m',
    Hidden = '\x1b[8m',

    FgBlack = '\x1b[30m',
    FgRed = '\x1b[31m',
    FgGreen = '\x1b[32m',
    FgYellow = '\x1b[33m',
    FgBlue = '\x1b[34m',
    FgMagenta = '\x1b[35m',
    FgCyan = '\x1b[36m',
    FgWhite = '\x1b[37m',

    BgBlack = '\x1b[40m',
    BgRed = '\x1b[41m',
    BgGreen = '\x1b[42m',
    BgYellow = '\x1b[43m',
    BgBlue = '\x1b[44m',
    BgMagenta = '\x1b[45m',
    BgCyan = '\x1b[46m',
    BgWhite = '\x1b[47m'
}
function editLine(lineNum = 1): string {
    return '\x1b['+lineNum + 'A';
}

async function SelectMenu (options: string[], selector = 0, editMode = false): Promise<string> {

    const _selector = selector;

    if (editMode) {
        console.log('\x1b[' + (options.length + 2) + 'A');
    }
    
    options.forEach((opt, index) => {
        if (index == selector) {
            console.log(Color.FgYellow + ' > ' + Color.FgGreen + opt + Color.Reset);
        } else {
            console.log(Color.FgBlue + ' > ' + Color.FgWhite + opt + Color.Reset);
        }
    });
    console.log('');

    for await (const keypress of readKeypress()) {
        if (keypress.key == 'up')
            if (selector > 0)
                selector--;
        if (keypress.key == 'down')
            if (selector < options.length-1)
                selector++;
        if (keypress.key == 'return') {
            console.log('\x1b[' + (options.length + 3) + 'A');
            console.log('\x1b[s');
            for (let i = 0; i <= options.length; i++) {
                console.log('\x1b[K');
            }
            console.log('\x1b[u');
            return options[selector];
        }
        if (keypress.ctrlKey && keypress.key === 'c') {
            Deno.exit(0);
            return '';
        }
        return SelectMenu(options, selector, true);
    }
    return '';
}

async function ask(question: string = '', stdin = Deno.stdin, stdout = Deno.stdout) {
    const buf = new Uint8Array(1024);

    // Write question to console
    await stdout.write(new TextEncoder().encode(question));

    // Read console's input into answer
    const n = <number>await stdin.read(buf);
    const answer = new TextDecoder().decode(buf.subarray(0, n));

    return answer.trim();
}

async function setupDocker(tag: string, args = "") {
    await Deno.mkdir("tools");
    await Deno.writeTextFile("tools/run.sh", "#!/bin/sh\ndocker build -t " + tag + " .\ndocker run " + (args != "" ? args + " " : "") + tag);
    await Deno.writeTextFile("tools/install.sh", "#!/bin/sh\ndocker build -t " + tag + " .");
    await Deno.chmod("./tools/run.sh", 0o777);
    await Deno.chmod("./tools/install.sh", 0o777);
}


function printHeader(style: string = "", name: string = "") {
    console.log(Color.FgYellow + '-----------------------------------------------------' + Color.Reset);
    console.log("Project: " + name);
    console.log("Path: " + Color.Reverse + Deno.cwd() + Color.Reset);
    if (style.length > 0) {console.log(Color.FgMagenta + style + Color.Reset)};
    console.log(Color.FgYellow + '-----------------------------------------------------' + Color.Reset);
}










console.log('\x1b[2J');
// console.log(' ');

if (Deno.args.length != 1) {
    console.log('Please use `lcreate <path>`');
    console.log('');
    Deno.exit(0);
}

if (!existsSync((Deno.args[0].startsWith('/') ? '' : Deno.cwd() + '/') + Deno.args[0])) {
    console.log('Directory ' + Color.Reverse + (Deno.args[0].startsWith('/') ? '' : Deno.cwd() + '/') + Deno.args[0] + Color.Reset + ' not found.');
    console.log('');
    Deno.exit(0);
}

Deno.chdir(Deno.cwd() + '/' + Deno.args[0]);
printHeader('');

console.log("");
const project_name = await ask("What would you like to name this project? ["+Deno.cwd().split('/').pop()+"]: ") || Deno.cwd().split('/').pop();
console.log('\x1b[2A\x1b[2J\x1b[A');

console.log('\x1b[4\x1b[2J\x1b[5A');
printHeader('', project_name);

console.log('');
console.log(Color.FgCyan + "[Type]" + Color.Reset);
console.log('What kind of app would you like to build?');
console.log('');
const type_q = await SelectMenu(['Static', 'ReactJS', 'NodeJS']);
console.log('\x1b[4A\x1b[2J\x1b[A');

// update path
console.log('\x1b[5\x1b[2J\x1b[6A');
printHeader('['+type_q+']', project_name);
// end update

console.log('');
console.log(Color.FgCyan + "[Docker]" + Color.Reset);
console.log("Would you like to use docker?");
console.log('');
const docker_q = await SelectMenu(['Docker', 'Vanilla']);
const docker: boolean = docker_q === 'Docker';
let docker_tag = '';
console.log('\x1b[4A\x1b[2J\x1b[A');

// update path
console.log('\x1b[5\x1b[2J\x1b[6A');
printHeader('['+type_q+'] ['+docker_q+']', project_name);
// end update

if (docker == true) {
    console.log("");
    docker_tag = await ask("Image name and tag [lucemans/lcreate:latest]: ");
    console.log('\x1b[2A\x1b[2J\x1b[A');

    // update path
    console.log('\x1b[5\x1b[2J\x1b[6A');
    printHeader('['+type_q+'] ['+docker_q+' ('+docker_tag+')]', project_name);
    // end update
}

let lang_q;
if (type_q == "NodeJS") {
    console.log('');
    console.log(Color.FgCyan + "[Language]" + Color.Reset);
    console.log("What language would you like to install?");
    console.log('');
    lang_q = await SelectMenu(['Typescript', 'Javascript']);
    console.log('\x1b[4A\x1b[2J\x1b[A');
}

console.log('');
console.log(Color.FgYellow + '[Ready Check]' + Color.Reset);
console.log('Are you ready?');
const ready_q = await SelectMenu(['Lets Go!', "ABORT"]);
console.log('\x1b[3A\x1b[2J\x1b[A');
if (ready_q == "ABORT") {
    console.log('Aborted');
    Deno.exit(0);
}

/** NOW RUN THE CODE! */
console.log('');
console.log(Color.FgYellow + "-----------------------------------------------------" + Color.Reset);
console.log("Building...");
console.log(Color.FgYellow + "-----------------------------------------------------" + Color.Reset);
console.log('');

/** Commence STATIC */
if (type_q === 'Static') {
    let spin = new Kia("Cloning from lucemans/lcreate-static");
    spin.start();
    await exec("git clone https://github.com/lucemans/lcreate-static.git .", {output: OutputMode.None});
    // console.log('Creating WWW folder');
    // await Deno.mkdir('www');
    // console.log('Creating index.html');
    // await Deno.writeTextFile('./www/index.html', '<!DOCTYPE html>\n<html lang="en">\n    <head>\n        <meta charset="UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1.0">\n        <title>Document</title>\n        <link rel="stylesheet" href="style.css">\n    </head>\n    <body>\n        Hello World!\n    </body>\n</html>');
    // console.log('Creating style.css');
    // await Deno.writeTextFile('./www/style.css', '');
    spin.succeed();
    spin = new Kia("Deleting .git");
    spin.start();
    await Deno.remove(".git", {recursive: true});
    spin.succeed();

    if (docker) {
        // console.log('Creating nginx folder');
        // await Deno.mkdir('nginx');
        // await Deno.writeTextFile('./nginx/nginx.conf', '#nginx config here');

        // console.log('Setting up Dockerfile');
        // await Deno.writeTextFileSync("Dockerfile", "FROM nginx:alpine\n\n# Uncomment the following line to enable NGINX config usage.\n# COPY nginx/nginx.conf /etc/nginx\n\nCOPY ./www/* /usr/share/nginx/html/");
        spin = new Kia("Dockerfile Scripts");
        spin.start();
        setupDocker(docker_tag, '-p 8080:80');
        spin.succeed();
    } else {
        spin = new Kia("Deleting Dockerfiles");
        spin.start();
        await Deno.remove("nginx", {recursive: true});
        await Deno.remove("Dockerfile", {recursive: true});
        spin.succeed();
    }

    spin = new Kia("Generating Git Repository");
    spin.start();
    await exec('git init', {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Adding Files to Git");
    spin.start();
    await exec('git add www', {output: OutputMode.None});
    if (docker) {
        await exec('git add nginx', {output: OutputMode.None});
        await exec('git add install.sh', {output: OutputMode.None});
        await exec('git add run.sh', {output: OutputMode.None});
        await exec('git add Dockerfile', {output: OutputMode.None})
    }
    await exec('git commit -m "[LCREATE] Initial Commit 🚀"', {output: OutputMode.None});
    spin.succeed();
    console.log('');
    console.log('Done! Happy Hacking!');
    console.log('');
    Deno.exit(0);
}
/** Commence REACTJS */
if (type_q == "ReactJS") {
    let spin = new Kia("Cloning from lucemans/lcreate-reactjs");
    spin.start();
    await exec("git clone https://github.com/lucemans/lcreate-reactjs.git .", {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Deleting .git");
    spin.start();
    await Deno.remove(".git", {recursive: true});
    spin.succeed();

    if (docker) {
        spin = new Kia("Dockerfile Scripts");
        spin.start();
        setupDocker(docker_tag, '-p 8080:80');
        spin.succeed();
    } else {
        spin = new Kia("Deleting Dockerfiles");
        spin.start();
        await Deno.remove("Dockerfile", {recursive: true});
        spin.succeed();
    }



    spin = new Kia("Setting up NPM");
    spin.start();
    await exec("npm init -y", {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Installing ReactJS");
    spin.start();
    await exec("npm install react react-dom --save", {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Installing Parcel-Bundler");
    spin.start();
    await exec("npm install --save-dev parcel-bundler", {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Installing Typescript");
    spin.start();
    await exec("npm install --save-dev typescript", {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Installing Types");
    spin.start();
    await exec("npm install --save-dev @types/react @types/react-dom", {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Installing Sass/Scss");
    spin.start();
    await exec("npm install --save node-sass", {output: OutputMode.None});
    spin.succeed();

    // "scripts": {
    //     "dev": "parcel src/index.html",
    //     "build": "parcel build src/index.html"
    // },

    spin = new Kia("Generating Git Repository");
    spin.start();
    await exec('git init', {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Adding Files to Git");
    spin.start();
    await exec('git add *', {output: OutputMode.None});
    if (docker) {
        // await exec('git add nginx');
        await exec('git add tools');
        await exec('git add Dockerfile')
    }
    await exec('git commit -m "[LCREATE] Initial Commit 🚀"');
    spin.succeed();
    console.log('');
    console.log('Done! Happy Hacking!');
    console.log('');
    Deno.exit(0);
}
/** Commence NODEJS */
if (type_q == "NodeJS") {
    let spin = new Kia("Cloning from lucemans/lcreate-nodejs");
    spin.start();
    await exec("git clone https://github.com/lucemans/lcreate-nodejs.git .");
    spin.succeed();
    spin = new Kia("Deleting .git");
    spin.start();
    await Deno.remove(".git", {recursive: true});
    spin.succeed();

    if (docker) {
        spin = new Kia("Dockerfile Scripts");
        spin.start();
        setupDocker(docker_tag, '-p 8080:8080');
        spin.succeed();
    } else {
        spin = new Kia("Deleting Dockerfiles");
        spin.start();
        await Deno.remove("Dockerfile", {recursive: true});
        spin.succeed();
    }

    if (lang_q == "Typescript") {
        spin = new Kia("Deleting Vanilla JS Files");
        spin.start();
        await Deno.remove("src/index.js", {recursive: true});
        spin.succeed();
    } else {
        spin = new Kia("Deleting Typescript Files");
        spin.start();
        await Deno.remove("src/index.ts", {recursive: true});
        spin.succeed();
    }



    spin = new Kia("Setting up NPM");
    spin.start();
    await exec("npm init -y", {output: OutputMode.None});
    spin.succeed();
    if (lang_q == "Typescript") {
        spin = new Kia("Installing Typescript");
        spin.start();
        await exec("npm install --save-dev typescript", {output: OutputMode.None});
        spin.succeed();
        spin = new Kia("Installing Types");
        spin.start();
        await exec("npm install --save-dev @types/node", {output: OutputMode.None});
        spin.succeed();
    }

    // "scripts": {
    //     "dev": "parcel src/index.html",
    //     "build": "parcel build src/index.html"
    // },

    spin = new Kia("Generating Git Repository");
    spin.start();
    await exec('git init', {output: OutputMode.None});
    spin.succeed();
    spin = new Kia("Adding Files to Git");
    spin.start();
    await exec('git add *', {output: OutputMode.None});
    if (docker) {
        // await exec('git add nginx');
        await exec('git add tools', {output: OutputMode.None});
        await exec('git add Dockerfile', {output: OutputMode.None})
    }
    await exec('git commit -m "[LCREATE] Initial Commit 🚀"', {output: OutputMode.None});
    spin.succeed();
    console.log('');
    console.log('Done! Happy Hacking!');
    console.log('');
    Deno.exit(0);
}
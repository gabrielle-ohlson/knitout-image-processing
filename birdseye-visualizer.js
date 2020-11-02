const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

let source_file;
readlineSync.setDefaultOptions({ prompt: chalk`{blue.bold \nWhat is the name of the file that you would like to visualize the backing for? }` });
readlineSync.promptLoop(function (input) {
  if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
  input = `${input}.k`;
  source_file = input;
  if (!fs.existsSync(`./knit-out-files/${input}`) && !fs.existsSync(`./knit-out-files/${input}.k`)) {
    console.log(chalk`{red -- Input valid name of a knitout (.k) file that exists in the 'knit-out-files' folder, please.}`);
  }
  return fs.existsSync(`./knit-out-files/${input}`);
});
console.log(chalk.green(`-- Reading from: ${source_file}`));

readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nSave as: ') });
let new_file, overwrite;
readlineSync.promptLoop(function (input) {
  if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
  input = `${input}.k`;
  new_file = input;
  // new_file = input;
  if (fs.existsSync(`./birdseye-files/${input}`) || fs.existsSync(`./birdseye-files/${input}.k`)) {
    overwrite = readlineSync.keyInYNStrict(
      chalk.black.bgYellow(`! WARNING:`) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`
    );
    return overwrite;
  }
  if (!fs.existsSync(`./birdseye-files/${input}`)) {
    return !fs.existsSync(`./birdseye-files/${input}.k`);
  }
});
console.log(chalk.green(`-- Saving new file as: ${new_file}`)); //TODO: fix this so removes wrong extension prior

let header = fs.readFileSync(`./knit-out-files/${source_file}`).toString().split('\n');

let in_file = header.splice(header.findIndex((line) => line.includes(`;background color:`)) + 1);

in_file = in_file.filter((line) => line.includes('knit + b') || line.includes('knit - b'));

in_file = in_file.map((lines) => lines.replace(' b', ' f'));
in_file.unshift(header);
console.log(in_file); //remove

let file_str = JSON.stringify(in_file)
  .replace(/\[|\]|"/gi, '')
  .split(',');
file_str = file_str.join('\n');

fs.writeFile(`./birdseye-files/${new_file}`, file_str, function (err) {
  if (err) return console.log(err);
  console.log(chalk`{green \nThe knitout file has successfully been written and can be found in the 'birdseye-files' folder.}`);
});

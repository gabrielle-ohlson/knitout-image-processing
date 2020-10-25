const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

let source_file, source_dir;
readlineSync.setDefaultOptions({ prompt: chalk`{blue.bold \nWhat is the name of the file that you would like to add shaping to? }` });
readlineSync.promptLoop(function (input) {
  if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
  input = `${input}.k`;
  source_file = input;
  if (
    !fs.existsSync(`./out-files/${input}`) &&
    !fs.existsSync(`./out-files/${input}.k`) &&
    !fs.existsSync(`./in-files/${input}`) &&
    !fs.existsSync(`./in-files/${input}.k`)
  ) {
    console.log(chalk`{red -- Input valid name of a knitout (.k) file that exists in either the 'out-files' or 'in-files' folder, please.}`);
  }
  if (fs.existsSync(`./in-files/${input}`)) {
    source_dir = './in-files/';
  } else if (fs.existsSync(`./out-files/${input}`)) {
    source_dir = './out-files/';
  }
  return fs.existsSync(`./out-files/${input}`) || fs.existsSync(`./in-files/${input}`);
});
console.log(chalk.green(`-- Reading from: ${source_file}`));
readlineSync.setDefaultOptions({ prompt: '' });

let in_file = fs
  .readFileSync(source_dir + source_file)
  .toString()
  .split(';!r');
for (let i = 0; i < in_file.length; ++i) {
  in_file[i] = in_file[i].split('\n');
  in_file[i] = in_file[i].filter((el) => !el.includes('ow:'));
}

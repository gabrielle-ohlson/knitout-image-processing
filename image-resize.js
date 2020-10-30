const Jimp = require('jimp');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const fs = require('fs');

let img;
let needle_count = 0;
let row_count = 0;
// if (!readlineSync.keyInYNStrict(chalk.blue.bold('Would you like to input an image for custom colorwork?'))) {
//   //remove //?
//   fs.writeFileSync('abort.txt', 'ABORT!');
//   process.exit();
// } else {
  readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nColorwork image file: ') });
  readlineSync.promptLoop(function (input) {
    img = input;
    if (!/\.jpg|\.jpeg|\.png|\.bmp$/i.test(input) || !fs.existsSync(`./in-colorwork-images/${input}`)) {
      let error_message = console.log(chalk.red(`The image must be a PNG, JPG, or BMP that exists in the 'in-colorwork-images' folder.`));
      return error_message;
    }
    if (fs.existsSync(`./in-colorwork-images/${input}`)) {
      return /\.jpg|\.jpeg|\.png|\.bmp$/i.test(input); //TODO: test that the program does work with .bmp, and maybe also add .svg
    }
  });
  console.log(chalk.green(`-- Reading colorwork data from: ${img}`));
  readlineSync.setDefaultOptions({ prompt: '' });
  needle_count = readlineSync.questionInt(chalk.blue.bold('\nHow many stitches wide? '), {
    limit: Number,
    limitMessage: chalk.red('-- $<lastInput> is not a number.'),
  });
  console.log(chalk.green(`-- Needle count: ${needle_count}`));
  //TODO: maybe limit needle_count and row_count to whole numbers (and limit needle_count to >0) ? or could just do .toFixed
  row_count = readlineSync.question(chalk`{blue.bold \nHow many rows long?} {blue.italic (press enter to scale rows according to img dimensions) }`, {
    defaultInput: -1,
    limit: Number,
    limitMessage: chalk.red('-- $<lastInput> is not a number.'),
  });
  row_count = Number(row_count);
  row_count === -1 ? console.log(chalk.green(`-- Row count: AUTO`)) : console.log(chalk.green(`-- Row count: ${row_count}`));
// }

if (row_count !== -1) { //TODO: check whether this is actually doing something I want it to do
  row_count += 1;
}

// if (img !== undefined) {
  if (row_count === -1) {
    row_count = Jimp.AUTO;
  }
  let colorwork_path = `./out-colorwork-images/colorwork.png`;
  if (fs.existsSync(colorwork_path)) {
    rename: for (let i = 1; i < 100; ++i) {
      if (!fs.existsSync(`./out-colorwork-images/colorwork${i}.png`)) {
        fs.renameSync(colorwork_path, `./out-colorwork-images/colorwork${i}.png`);
        break rename;
      }
    }
  }
  Jimp.read(`./in-colorwork-images/${img}`, (err, image) => {
    if (err) throw err;
    image.resize(needle_count, row_count).write(colorwork_path);
  });
// }

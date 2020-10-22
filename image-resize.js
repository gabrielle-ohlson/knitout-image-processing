const Jimp = require('jimp');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
// import Jimp from 'jimp';
// import readlineSync from 'readline-sync';
// import chalk from 'chalk';

let img;
let needle_count = 0;
let row_count = 0;
if (!readlineSync.keyInYN(chalk.blue.bold('Would you like to input an image for custom colorwork?'))) {
  process.exit();
} else {
  img = readlineSync.questionPath(chalk.blue.bold('\nImage File: '), {
    validate: function (path) {
      return /\.jpg|\.jpeg|\.png|\.bmp$/i.test(path) || chalk.red('The image must be a PNG, JPG, or BMP.');
    },
    limitMessage: chalk.red('The image must be a PNG, JPG, or BMP that exists in the working directory.'),
  });
  needle_count = readlineSync.questionInt(chalk.blue.bold('\nHow many stitches wide? '), {
    limit: Number,
    limitMessage: chalk.red('-- $<lastInput> is not a number.'),
  });
  console.log(chalk.green(`-- Needle count: ${needle_count}`));
  //TODO: limit needle_count and row_count to whole numbers (and limit needle_count to >0)
  row_count = readlineSync.questionInt(chalk.blue.bold('\nHow many rows long? (enter 0 to scale rows according to img dimensions) '), {
    limit: Number,
    limitMessage: chalk.red('-- $<lastInput> is not a number.'),
  });
  console.log(chalk.green(`-- Row count: ${row_count}`));
}

if (row_count !== 0) {
  row_count += 1;
}

if (img !== undefined) {
  if (row_count === 0) {
    row_count = Jimp.AUTO;
  }
  Jimp.read(img, (err, image) => {
    if (err) throw err;
    image.resize(needle_count, row_count).write('color_work.png');
    // return image;
  });
}
const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const Jimp = require('jimp');
const RgbQuant = require('rgbquant');

if (fs.existsSync('abort.txt')) {
  fs.unlinkSync('abort.txt');
  console.log(chalk`{bold.bgGray.underline \n*** If you would like to use this program to add shaping to a knitout file, type 'node shapeify.js'}`);
  process.exit();
}

let height, width, data;
let palette, reduced;
let colors_arr = [];

let machine = readlineSync.question(chalk.blue.bold('\nWhat model knitting machine will you be using? '), {
  limit: [
    function (input) {
      return input.toLowerCase().includes(`shima`) || input.toLowerCase().includes(`kniterate`); //? include stoll too?
    },
  ],
  limitMessage: chalk.red(
    '-- The program does not currently support the $<lastInput> machine. Please open an issue at the github repository (https://github.com/textiles-lab/knitout-image-processing) to request for this machine to be supported.'
  ),
});
machine = machine.toLowerCase();
console.log(chalk.green(`-- Model: ${machine}`)); //? model ??

let carrier_count;
machine.includes('shima') ? (carrier_count = 10) : (carrier_count = 6); //TODO: limit needle bed with this too (prob will have to use promises)
let max_colors = readlineSync.question(chalk.blue.bold('\nHow many colors would you like to use? '), {
  limit: machine.includes('shima') ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6],
  limitMessage: chalk.red(
    `-- The ${machine} machine is capable of working with a max of ${carrier_count} colors per row, but $<lastInput> is not within that accepted range. Please input a valid number.`
  ),
});
max_colors = Number(max_colors);
console.log(chalk.green(`-- Knitting with ${max_colors} colors.`)); //TODO: decide how to phrase this (? model ??)

let opts = {
  colors: max_colors,
  method: 2,
  //TODO: method: 1, //2 seems overall better, but could be good to test on more images
  minHueCols: 0, //TODO: test this more too
};

// if (fs.existsSync('color_work.png')) {
function getData() {
  const processImage = new Promise((resolve) => {
    Jimp.read('color_work.png').then((image) => {
      width = image.bitmap.width;
      height = image.bitmap.height;
      data = image.bitmap.data;
      let q = new RgbQuant(opts);
      q.sample(data, width);
      palette = q.palette(true);
      let hex_arr = [];
      for (let h = 0; h < palette.length; ++h) {
        hex_arr.push(Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255)); //255 bc hex
      }
      reduced = q.reduce(data, 2); ////indexed array
      new Jimp(width, height, (err, img) => {
        if (err) throw err;
        for (let y = 0; y < height; ++y) {
          let px_arr = reduced.splice(0, width);
          let px_map = [...px_arr];
          px_map = px_map.map((el) => (el += 1));
          colors_arr.push(px_map); ////make it into an array with rows
          for (let x = 0; x < width; ++x) {
            let hex = hex_arr[px_arr[x]];
            img.setPixelColor(hex, x, y);
          }
        }
        colors_arr.push(palette, machine);
        img.write('knit_motif.png');
        resolve(colors_arr);
      });
    });
  });
  return processImage;
}
// }
module.exports = { getData, colors_arr };

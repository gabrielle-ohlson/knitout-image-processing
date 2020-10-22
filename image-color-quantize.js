const readlineSync = require('readline-sync');
const chalk = require('chalk');
const fs = require('fs');
const Jimp = require('jimp');
// const quantize = require('quantize');
const RgbQuant = require('rgbquant');

////
let max_colors;
let palette;
let reduced;
let colors_arr = [];
// if (max_colors === undefined) {
max_colors = readlineSync.questionInt(chalk.blue.bold('\nHow many colors would you like to use? '), {
  limit: [1, 2, 3, 4, 5, 6],
  limitMessage: chalk.red(
    '-- The kniterate machine is capable of working with a max of 6 colors per row, but $<lastInput> is not within that accepted range. Please input a valid number.'
  ),
});

let opts = {
  colors: max_colors,
  method: 2,
  // method: 1, //2 seems overall better, but could be good to test on more images
  minHueCols: 0, //maybe
};

if (fs.existsSync('color_work.png')) {
  Jimp.read('color_work.png')
    .then((image) => {
      console.log(image); //remove
      let width = image.bitmap.width;
      let height = image.bitmap.height;
      let data = image.bitmap.data;
      let q = new RgbQuant(opts);
      q.sample(data, width);
      palette = q.palette(true);
      let hex_arr = [];
      for (let h = 0; h < palette.length; ++h) {
        hex_arr.push(Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255)); //255 bc hex
      }
      // console.log(hex_arr); //remove
      reduced = q.reduce(data, 2); //indexed array
      // console.log(palette); //remove
      // console.log(reduced); //remove
      new Jimp(width, height, (err, img) => {
        if (err) throw err;
        for (let y = 0; y < height; ++y) {
          let px_arr = reduced.splice(0, width);
          colors_arr.push(px_arr); ////make it into an array with rows
          for (let x = 0; x < width; ++x) {
            let hex = hex_arr[px_arr[x]];
            img.setPixelColor(hex, x, y);
          }
        }
        // console.log(colors_arr);
        // image.dither565(); //?
        img.write('reduced_colors.png');
      });
      // module.exports = { colors_arr };
      fs.writeFile('COLORS_DATA.json', JSON.stringify(colors_arr), 'utf8', (err) => {
        if (err) {
          throw err;
        }
      });
    })
    .catch((err) => {
      throw err;
    });
}
// }

module.exports = { colors_arr };

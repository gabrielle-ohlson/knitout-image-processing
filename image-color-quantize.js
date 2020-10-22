// import readlineSync from 'readline-sync';
// import chalk from 'chalk';
// import fs from 'fs';
// import Jimp from 'jimp';
// import RgbQuant from 'rgbquant';
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const Jimp = require('jimp');
const RgbQuant = require('rgbquant');

////
let height, width, data;
let palette, reduced;
let colors_arr = [];
// let hex_arr = [];

// if (max_colors === undefined) {
let max_colors = readlineSync.questionInt(chalk.blue.bold('\nHow many colors would you like to use? '), {
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

// if (fs.existsSync('color_work.png')) {
// export function getData() {
function getData() {
  // export default async function getData(arr) {
  const processImage = new Promise((resolve) => {
    Jimp.read('color_work.png').then((image) => {
      // console.log(image); //remove
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
      // console.log(hex_arr); //remove
      reduced = q.reduce(data, 2); //indexed array
      new Jimp(width, height, (err, img) => {
        if (err) throw err;
        for (let y = 0; y < height; ++y) {
          let px_arr = reduced.splice(0, width);
          let px_map = [...px_arr];
          // console.log(px_map);
          // console.log(typeof px_map[0]);
          px_map = px_map.map((el) => (el += 1));
          // console.log(px_map);
          colors_arr.push(px_map); ////make it into an array with rows
          for (let x = 0; x < width; ++x) {
            let hex = hex_arr[px_arr[x]];
            img.setPixelColor(hex, x, y);
          }
        }
        colors_arr.push(palette); //new
        img.write('reduced_colors.png');
        //   // module.exports = { colors_arr };
        resolve(colors_arr);
        // return resolve((module.exports = colors_arr));
      });
      // return colors_arr;
      // });
      // .finally(() => {
      //   for (let y = 0; y < height; ++y) {
      //     let px_arr = reduced.splice(0, width);
      //     colors_arr.push(px_arr); ////make it into an array with rows
      //     // for (let x = 0; x < width; ++x) {
      //       // let hex = hex_arr[px_arr[x]];
      //       // img.setPixelColor(hex, x, y);
      //     // }
      //   }
      // return resolve(colors_arr);
    });
  });
  return processImage;
}

module.exports = { getData, colors_arr };

// export default processImage();

// export { colors_arr };

// fs.writeFile('COLORS_DATA.json', JSON.stringify(colors_arr), 'utf8', (err) => {
//   if (err) {
//     throw err;
//   }
// });
// export p, colors_arr;
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const fs = require('fs');
const Jimp = require('jimp');
// const quantize = require('quantize');
const RgbQuant = require('rgbquant');

////

let max_colors = readlineSync.questionInt(chalk.blue.bold('\nHow many colors would you like to use? '), {
  limit: [1, 2, 3, 4, 5, 6],
  limitMessage: chalk.red(
    '-- The kniterate machine is capable of working with a max of 6 colors per row, but $<lastInput> is not within that accepted range. Please input a valid number.'
  ),
});

let opts = {
  colors: max_colors,
  method: 2, //maybe try 1 next
  // method: 1, //maybe try 1 next
  minHueCols: 0, //maybe
};

let palette;
let reduced;
if (fs.existsSync('color_work.png')) {
  Jimp.read('color_work.png')
    .then((image) => {
      // Jimp.read('color_work.png', (image) => {
      // if (err) throw err;
      console.log(image); //remove
      let width = image.bitmap.width;
      let height = image.bitmap.height;
      let data = image.bitmap.data;
      let q = new RgbQuant(opts);
      // q.sample(image, width);
      q.sample(data, width);
      palette = q.palette(true);
      let hex_arr = [];
      for (let h = 0; h < palette.length; ++h) {
        hex_arr.push(Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255)); //255 bc hex
      }
      console.log(hex_arr); //remove
      // reduced = q.reduce(image);
      reduced = q.reduce(data, 2); //indexed array
      console.log(palette); //remove
      console.log(reduced); //remove
      // return image;
      // return reduced;
      new Jimp(width, height, (err, img) => {
        // new Jimp(reduced[0].length, reduced.length, (img) => {
        if (err) throw err;
        for (let y = 0; y < height; ++y) {
          // let px_arr = reduced[y];
          // let px_arr = reduced.splice(0, width);
          let px_arr = reduced.splice(0, width);
          for (let x = 0; x < width; ++x) {
            // let rgb_arr = px_arr.splice(0, 3);
            // let px_arr = reduced.splice(0, width);
            let hex = hex_arr[px_arr[x]];
            // for (let p = 0; p < reduced_colors[x][0].length; ++p) { // < 3 bc rgb
            // let hex = Jimp.rgbaToInt(rgb_arr[0], rgb_arr[1], rgb_arr[2], 255); //255 bc hex
            // console.log(hex);
            img.setPixelColor(hex, x, y);
          }
        }
        // image.dither565(); //?
        img.write('reduced_colors.png');
      });
    })
    // .try(
    ////
    // new Jimp(reduced[0].length, reduced.length, (img) => {
    // new Jimp(reduced[0].length, reduced.length, (img) => {
    //   // if (err) throw err;
    //   for (let y = 0; y < reduced.length; ++y) {
    //     let px_arr = reduced[y];
    //     for (let x = 0; x < px_arr.length; ++x) {
    //       let rgb_arr = px_arr.splice(0, 3);
    //       // for (let p = 0; p < reduced_colors[x][0].length; ++p) { // < 3 bc rgb
    //       let hex = Jimp.rgbaToInt(rgb_arr[0], rgb_arr[1], rgb_arr[2], 255); //255 bc hex
    //       img.setPixelColor(hex, x, y); //white
    //     }
    //   }
    //   // image.dither565(); //?
    //   img.write('reduced_colors2.png');
    // })
    // )
    // .then(() => {
    // new Jimp(reduced[0].length, reduced.length, (err, img) => {
    //   if (err) throw err;
    //   for (let y = 0; y < reduced.length; ++y) {
    //     let px_arr = reduced[y];
    //     for (let x = 0; x < px_arr.length; ++x) {
    //       let rgb_arr = px_arr.splice(0, 3);
    //       // for (let p = 0; p < reduced_colors[x][0].length; ++p) { // < 3 bc rgb
    //       let hex = Jimp.rgbaToInt(rgb_arr[0], rgb_arr[1], rgb_arr[2], 255); //255 bc hex
    //       img.setPixelColor(hex, x, y); //white
    //     }
    //   }
    //   // image.dither565(); //?
    //   img.write('reduced_colors2.png');
    // })
    // })
    .catch((err) => {
      throw err;
    });
}

// let pixels;
// let reduced_palette;
// let reduced_colors = [];

// if (fs.existsSync('color_work.png')) {
//   Jimp.read('color_work.png')
//     .then((image) => {
//       let width = image.bitmap.width;
//       let height = image.bitmap.height;
//       pixels = [];
//       for (let y = 0; y < height; ++y) {
//         let row_pixels = [];
//         for (let x = 0; x < width; ++x) {
//           let pixel = Jimp.intToRGBA(image.getPixelColor(x, y));
//           // row_pixels.push(`${pixel.r};${pixel.g};${pixel.b};${x};${y}`);
//           row_pixels.push(pixel.r, pixel.g, pixel.b);
//         }
//         pixels.push(row_pixels);
//       }
//       console.log(pixels); //remove
//       let colorMap = quantize(pixels, max_colors);
//       reduced_palette = colorMap.palette();
//       console.log(reduced_palette); //remove
//       for (let y = 0; y < height; ++y) {
//         let row_pixels = []; //new
//         for (let x = 0; x < width; ++x) {
//           row_pixels.push(colorMap.map(pixels[x]));
//           // reduced_colors.push(colorMap.map(pixels[y]));
//         }
//         reduced_colors.push(row_pixels);
//       }
//       /////
//       new Jimp(reduced_colors[0].length, reduced_colors.length, (err, img) => {
//         if (err) throw err;
//         for (let y = 0; y < reduced_colors.length; ++y) {
//           let px_arr = reduced_colors[y];
//           for (let x = 0; x < px_arr.length; ++x) {
//             // for (let p = 0; p < reduced_colors[x][0].length; ++p) { // < 3 bc rgb
//             let hex = Jimp.rgbaToInt(px_arr[x][0], px_arr[x][1], px_arr[x][2], 255); //255 bc hex
//             img.setPixelColor(hex, x, y); //white
//           }
//         }
//         // image.dither565(); //?
//         img.write('reduced_colors.png');
//       });
//     })
//     .catch((err) => {
//       throw err;
//     });
// }

// module.exports = { reduced_colors };

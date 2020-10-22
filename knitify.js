// import * as imageColors from './image-color-quantize.js';
// let carriers_arr = [];
// imageColors
//   .getData()
//   .then((result) => {
//     carriers_arr = result;
//     return result;
//   })
//   .finally(() => {
//     console.log(carriers_arr); // arr = imageColors.colors_arr;
//   });

const imageColors = require('./image-color-quantize.js');
let carriers_arr = [];
imageColors
  .getData()
  .then((result) => {
    carriers_arr = result;
    return result;
  })
  .then(() => { //heres where all the functions will go
    console.log(carriers_arr); // arr = imageColors.colors_arr;
  });


// const { colors_arr } = require('./image-color-quantize');

// console.log(colors_arr);
// const fs = require('fs');

// const readlineSync = require('readline-sync');
// const chalk = require('chalk');

// let max_colors = readlineSync.questionInt(chalk.blue.bold('\nHow many colors would you like to use? '), {
//   limit: [1, 2, 3, 4, 5, 6],
//   limitMessage: chalk.red(
//     '-- The kniterate machine is capable of working with a max of 6 colors per row, but $<lastInput> is not within that accepted range. Please input a valid number.'
//   ),
// });
// let colors_arr = colors_arr;

// module.exports = { max_colors };

// const { colors_arr } = require('./image-color-quantize');
// import { p, colors_arr } from './image-color-quantize.js';
// import * as imageColors from './image-color-quantize.js';
// // console.log(imageColors.colors_arr);// console.log(colors.colors_arr);

// // import colors_arr from './image-color-quantize.js';
// // p.then(() => {
// //   // import { colors_arr } from './image-color-quantize.js';
// //   return colors_arr;
// // });
// // let carriers_arr = [];
// // const colors = require('./image-color-quantize').default;
// // colors.colors_arr
// // console.log(colors_arr);// console.log(colors.colors_arr);
// // import * as imageColors from './image-color-quantize.js';
// // imageColors();
// // import imageColors from './wingman.js';
// // void (() => {
// let carriers_arr = [];
// imageColors
//   .getData()
//   .then((result) => {
//     // console.log(result);
//     // carriers_arr = result;
//     carriers_arr = result;
//     return result;
//     // return (carriers_arr = result);
//     // import { colors_arr } from './image-color-quantize.js';
//   })
//   .finally(() => {
//     console.log(carriers_arr); // arr = imageColors.colors_arr;
//   });
//     // .finally(Promise.resolve());
// });
// void Resolve(carriers_arr);
// await function setTimeout(
//   , timeout);
// }
// await setTimeout();
//   carriers_arr = imageColors.colors_ar
// }
// .finally((result) => {
//   carriers_arr = result;
// });
// console.log(imageColors.colors_arr);
// console.log(carriers_arr);
// const getInfo = (req) => {
//   return imageColors.c;
// };
// getInfo();
// // let p = await import('./image-color-quantize.js');
// console.log(imageColors.c);
// awaitImage();
// (async function processImage() {
// processImage().then(console.log('done'));
// import { colors_arr } from './image-color-quantize.js';
// import colors_arr from './image-color-quantize.js';
// console.log(colors_arr);

// (async function() {
//   const colors_arr = await p();
//   console.log('p', colors_arr);
// })();

// p.then(console.log(p.finally(console.log(p.colors_arr))));
// console.log(p.colors_arr);
// console.log(colors_arr);
// let colors_arr = [];
// if (fs.existsSync('COLORS_DATA.json')) {
//   let colors_str = fs.readFileSync('COLORS_DATA.json').toString();
//   let arr = colors_str.replace(/"|\[|\]]/g, '').split('],');
//   for (let i = 0; i < arr.length; ++i) {
//     let color_values = arr[i].split(',');
//     for (let n = 0; n < color_values.length; ++n) {
//       color_values[n] = Number(color_values[n]);
//     }
//     colors_arr.push(color_values);
//     // rgb_arr[i] = rgb_values;
//     // brightness = lightOrDark(rgb_arr[i]);
//     // rgb_arr[i].splice(0, 3, brightness);
//     // if (i === rgb_arr.length - 1) {
//     //   max = [...rgb_arr[i]];
//     //   last_row = max.pop();
//     // }
//   }
//   // console.log(`last_row = ${last_row}`);
//   // console.log(`rgb_arr.length = ${rgb_arr.length}`);

//   // let shape_row = [];
//   // // let curr_row = last_row;
//   // ////////option for flipped image array
//   // // for (let i = rgb_arr.length - 1; i > 0; --i) {
//   // // for (let i = rgb_arr.length - 1; i >= 0; --i) {
//   // //   // let shape_row = [];
//   // //   if (rgb_arr[i].includes('light')) {
//   // //     shape_row.push(0);
//   // //   } else {
//   // //     shape_row.push(1);
//   // //   }
//   // //   // if (!rgb_arr[i].includes(curr_row)) {
//   // //   if (i === 0) {
//   // //     shape_code.push(shape_row);
//   // //     break;
//   // //   }
//   // //   if (!rgb_arr[i - 1].includes(curr_row)) {
//   // //     //i + 1
//   // //     --curr_row;
//   // //     shape_code.push(shape_row);
//   // //     shape_row = [];
//   // //   }
//   // // }
//   // ///////
//   // let curr_row = 0;
//   // for (let i = 0; i < rgb_arr.length; ++i) {
//   //   if (rgb_arr[i].includes('light')) {
//   //     shape_row.push(0);
//   //   } else {
//   //     shape_row.push(1);
//   //   }
//   //   if (i === rgb_arr.length - 1) {
//   //     shape_code.push(shape_row);
//   //     break;
//   //   }
//   //   let sub_arr = rgb_arr[i + 1];
//   //   let next_row = sub_arr.pop();
//   //   if (next_row !== curr_row) {
//   //     ++curr_row;
//   //     shape_code.push(shape_row);
//   //     shape_row = [];
//   //   }
//   // }

//   // //TODO: maybe remove this
//   // let xtra_char;
//   // for (let i = 0; i < shape_code.length - 1; ++i) {
//   //   //NOTE: - 1 is correct
//   //   if (shape_code[i].length === last_row + 1) {
//   //     xtra_char = shape_code[i].pop();
//   //     console.log(chalk.red('!!too long!!'));
//   //   }
//   //   if (shape_code[i + 1].length === last_row - 1) {
//   //     shape_code[i + 1].push(xtra_char);
//   //     console.log(chalk.red('!!too short!!'));
//   //   }
//   // }
//   // ////////////////////////////////////////////////////////
//   // //make sure there aren't any floating white dots in the middle
//   // console.log(`Xpixel count = ${shape_code[0].length}`);
//   // console.log(`Ypixel count = ${shape_code.length}`);

//   // let splice_arr = [];
//   // for (let y = 0; y < shape_code.length - 1; ++y) {
//   //   let px_arr = shape_code[y];
//   //   if (px_arr.includes(0) && px_arr.includes(1)) {
//   //     let px0_arr = []; //array for white pixels
//   //     for (let i = 0; i < px_arr.length; ++i) {
//   //       if (px_arr.indexOf(0, i) === -1) {
//   //         break;
//   //       }
//   //       let px_idx = px_arr.indexOf(0, i);
//   //       if (!px0_arr.includes(px_idx)) {
//   //         px0_arr.push(px_idx);
//   //       }
//   //     }
//   //     let left_px1 = px_arr.indexOf(1); //first black px
//   //     let right_px1 = px_arr.lastIndexOf(1); //last black px
//   //     px0_arr.forEach((px0) => {
//   //       if (px0 > left_px1 && px0 < right_px1) {
//   //         // shape_code[y].splice(px0, 1, 1);
//   //         shape_code[y].splice(px0, 1, '*'); //* means it was replaced
//   //         splice_arr.push(y); //to show where the first * row is
//   //       }
//   //     });
//   //     //TODO: write func for cleaning up floating black dots in the background
//   //     //TODO: figure out how to deal with kelp situation
//   //   }
//   // }
//   // let white_space;
//   // for (let r = splice_arr[splice_arr.length - 1]; r >= 0; --r) {
//   //   //r > 0?
//   //   let white_arr = [];
//   //   for (let i = 0; i < shape_code[0].length; ++i) {
//   //     if (shape_code[r].indexOf('*', i) === -1) {
//   //       break;
//   //     }
//   //     let px_idx = shape_code[r].indexOf('*', i);
//   //     if (!white_arr.includes(px_idx)) {
//   //       white_arr.push(px_idx);
//   //     }
//   //   }
//   //   for (let w = 0; w < white_arr.length; ++w) {
//   //     let w_px = white_arr[w];
//   //     for (let z = r - 1; z > 0; --z) {
//   //       let next_row = shape_code[z];
//   //       if (next_row[w_px] === '*') {
//   //         white_space = true;
//   //       } else {
//   //         white_space = false;
//   //         break;
//   //       }
//   //     }
//   //     if (white_space === true) {
//   //       shape_code[r].splice(w_px, 1, 0);
//   //       short_row_section = true;
//   //     } else {
//   //       shape_code[r].splice(w_px, 1, 1);
//   //     }
//   //   }
//   // }
//   // ////////////////////////////////
//   // for (let y = 0; y < shape_code.length; ++y) {
//   //   let px_arr = shape_code[y];
//   //   let overlap1;
//   //   for (let x = 0; x < shape_code[0].length; ++x) {
//   //     if (shape_code[y + 1] !== undefined) {
//   //       if (px_arr[x] === 0) {
//   //         //to prevent throwing errors after overlapping stitches to the left, if consecutive
//   //         overlap1 === undefined;
//   //       }
//   //       if (px_arr[x] === 1) {
//   //         if (px_arr[x] !== shape_code[y + 1][x] && overlap1 !== true) {
//   //           if (px_arr[x + 1] === 1) {
//   //             for (let o = x + 1; o <= px_arr.lastIndexOf(1); ++o) {
//   //               //maybe < not <=
//   //               if (px_arr[o] === 1) {
//   //                 if (px_arr[o] !== shape_code[y + 1][o]) {
//   //                   overlap1 = false;
//   //                 } else {
//   //                   overlap1 = true;
//   //                   break;
//   //                 }
//   //               }
//   //             }
//   //           } else {
//   //             overlap1 = false;
//   //           }
//   //         } else {
//   //           overlap1 = true;
//   //         }
//   //       }
//   //       if (overlap1 === false) {
//   //         shape_err_row = y;
//   //         console.log(
//   //           chalk.red(
//   //             `ShapeError: no overlapping stitches between row #${y + 1} and row #${
//   //               y + 2
//   //             }.\nCheck working directory for 'shape_code.png' to see visualization of first error in image. (Error pixels are red)\n`
//   //           )
//   //         );
//   //         shape_error = true;
//   //         break;
//   //       }
//   //     }
//   //   }
//   //   if (shape_error === true) {
//   //     break;
//   //   }
//   // }
//   // new Jimp(shape_code[0].length, shape_code.length, (err, image) => {
//   //   if (err) throw err;
//   //   for (let y = 0; y < shape_code.length; ++y) {
//   //     let px_arr = shape_code[y];
//   //     for (let x = 0; x < shape_code[0].length; ++x) {
//   //       if (y !== shape_err_row && y !== shape_err_row + 1) {
//   //         //TODO: figure out why it only gets the first pink dot for second row
//   //         if (px_arr[x] === 0) {
//   //           image.setPixelColor(0xffffffff, x, y); //white
//   //         } else if (px_arr[x] === 1) {
//   //           image.setPixelColor(255, x, y); //black
//   //         } else {
//   //           console.log(chalk.red(`ShapeError: invalid character (such as '*') still in array`));
//   //         }
//   //       } else {
//   //         if (px_arr[x] === 0) {
//   //           image.setPixelColor(4293520639, x, y); //light pink
//   //         } else if (px_arr[x] === 1) {
//   //           image.setPixelColor(4278190335, x, y); //red
//   //         }
//   //       }
//   //     }
//   //   }
//   //   image.dither565();
//   //   image.write('shape_code.png');
//   // });
//   // ////create flipped (horiz & vert) version of shape code array for it is processed in the right direction
//   // for (let i = 0; i < shape_code.length; ++i) {
//   //   let subarr_reverse = shape_code[i].reverse();
//   //   shape_code_reverse.push(subarr_reverse);
//   // }
//   // shape_code_reverse = shape_code_reverse.reverse();
//   // // console.log(shape_code); //TODO: remove eventually
//   // // console.log(shape_code_reverse); //TODO: also remove
//   // // console.log(`splice_arr beg: ${splice_arr[splice_arr.length - 1]}`);
//   // // console.log(`splice_arr end: ${splice_arr[0]}`);
//   // // console.log(`for reverse beg: ${shape_code_reverse.length - 1 - splice_arr[splice_arr.length - 1]}`);
//   // // console.log(`for reverse end: ${shape_code_reverse.length - 1 - splice_arr[0]}`);
//   // first_short_row = shape_code_reverse.length - 1 - splice_arr[splice_arr.length - 1];
//   // last_short_row = shape_code_reverse.length - 1 - splice_arr[0];
// }

// console.log(colors_arr);

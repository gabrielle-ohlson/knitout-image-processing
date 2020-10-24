// const { colors_arr } = require('./image-color-quantize');
// const readlineSync = require('readline-sync');
// const chalk = require('chalk');

// let max_colors = readlineSync.questionInt(chalk.blue.bold('\nHow many colors would you like to use? '), {
//   limit: [1, 2, 3, 4, 5, 6],
//   limitMessage: chalk.red(
//     '-- The kniterate machine is capable of working with a max of 6 colors per row, but $<lastInput> is not within that accepted range. Please input a valid number.'
//   ),
// });
// // let colors_arr = colors_arr;

// module.exports = { max_colors };
import processImage, { colors_arr } from './image-color-quantize.js';
await processImage.then(console.log(colors_arr));
// console.log(processImage)
const imageColors = { c: colors_arr };
// processImage().then(() => (imageColors.c = colors_arr));
// processImage().then((val) => (imageColors.c = val));
export default imageColors;
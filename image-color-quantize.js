const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const Jimp = require('jimp');
const RgbQuant = require('rgbquant');

let height, width, data;
let palette, reduced;
let colors_arr = [];
let pal_hist = [];
let background = [];
let colors_data = []; //new loc

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
//TODO: add support for different shima modesls (and maybe stoll?)
let carrier_count;
machine.includes('shima') ? (carrier_count = 10) : (carrier_count = 6); //TODO: limit needle bed with this too (prob will have to use promises :,( )
let max_colors = readlineSync.question(chalk.blue.bold('\nHow many colors would you like to use? '), {
  limit: machine.includes('shima') ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] : [1, 2, 3, 4, 5, 6],
  limitMessage: chalk.red(
    `-- The ${machine} machine is capable of working with a max of ${carrier_count} colors per row, but $<lastInput> is not within that accepted range. Please input a valid number.`
  ),
});
max_colors = Number(max_colors);
console.log(chalk.green(`-- Knitting with ${max_colors} colors.`));
//QUESTIONS:
//minHueColors: Are there low-occuring colors you'd like to preserve? (Y: max_colors; N: 0)
//dithKern: Would you like to use dithering? (Y: ?; N: null)
let dithering = readlineSync.keyInYNStrict(
  chalk`{blue.bold \nWould you like to use dithering?} {blue.italic (dithering is recommended for detailed/naturalistic images, but not for graphics/digital artwork.)}`
);
dithering === true ? (dithering = 'Stucki') : (dithering = null);

/////
const hexToRGB = (hex) => {
  let alpha = false,
    h = hex.slice(hex.startsWith('#') ? 1 : 0);
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  else if (h.length === 8) alpha = true;
  h = parseInt(h, 16);
  return [
    Number((alpha ? a : '') + (h >>> (alpha ? 24 : 16))),
    Number((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)),
    Number(((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) + (alpha ? h & 0x000000ff : '')),
  ];
};
let palette_opt = []; //new
if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to use a predefined palette?}`)) {
  for (let i = 1; i <= max_colors; ++i) {
    let hex = readlineSync.question(chalk.blue.bold(`\nEnter hex-code for color #${i}: `));
    palette_opt.push(hexToRGB(hex));
  }
}
console.log(palette_opt); //remove

let opts = {
  colors: max_colors,
  method: 2,
  // method: 1,
  //TODO: method: 1, //2 seems overall better, but could be good to test on more images
  // minHueCols: 0, //TODO: test this more too
  minHueCols: max_colors, //TODO: test this more too
  // dithKern: null, //new
  // dithKern: 'Stucki', //new
  dithKern: dithering, //new
  //FloydSteinberg(-/+), Stucki(++), Atkinson(-), Jarvis(+?), null
  // dithDelta: 1, //new
  // palette: [
  //   [0, 0, 0], #000000
  //   [254, 210, 8], #fed208
  //   [123, 51, 28], #7b331c
  //   [182, 172, 212], #b6acd4
  //   [52, 54, 149], #343695
  //   [123, 28, 45], #7b1c2d
  // ], //remove
};

if (palette_opt.length > 0) {
  opts.palette = palette_opt;
}

console.log(opts); //remove

function getData() {
  const processImage = new Promise((resolve) => {
    Jimp.read(`./out-colorwork-images/colorwork.png`).then((image) => {
      width = image.bitmap.width;
      height = image.bitmap.height;
      data = image.bitmap.data;
      let q = new RgbQuant(opts);
      q.sample(data, width);
      palette = q.palette(true, true);
      q.idxi32.forEach(function (i32) {
        ////return array of palette color occurrences
        // pal_hist.push({ color: q.i32rgb[i32], count: q.histogram[i32] });
        pal_hist.push(q.histogram[i32]);
      });
      let hex_arr = [];
      const RGBToHex = (r, g, b) => ((r << 16) + (g << 8) + b).toString(16).padStart(6, '0');
      for (let h = 0; h < palette.length; ++h) {
        hex_arr.push(Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255)); //255 bc hex
        colors_data.push(RGBToHex(palette[h][0], palette[h][1], palette[h][2]));
      }
      for (let h = 1; h <= colors_data.length; ++h) {
        colors_data[h - 1] = `x-vis-color #${colors_data[h - 1]} ${h}`;
      }
      /////
      reduced = q.reduce(data, 2); ////indexed array
      let motif_path = `./out-colorwork-images/knit_motif.png`;
      if (fs.existsSync(motif_path)) {
        rename: for (let i = 1; i < 100; ++i) {
          if (!fs.existsSync(`./out-colorwork-images/knit_motif${i}.png`)) {
            fs.renameSync(motif_path, `./out-colorwork-images/knit_motif${i}.png`);
            break rename;
          }
        }
      }
      new Jimp(width, height, (err, img) => {
        if (err) throw err;
        for (let y = 0; y < height; ++y) {
          let px_arr = reduced.splice(0, width);
          background.push(px_arr[0], px_arr[px_arr.length - 1]); ////push edge colors to background array
          let px_map = [...px_arr];
          px_map = px_map.map((el) => (el += 1));
          colors_arr.push(px_map); ////make it into an array with rows
          for (let x = 0; x < width; ++x) {
            let hex = hex_arr[px_arr[x]];
            img.setPixelColor(hex, x, y);
          }
        }
        background = background.reduce((a, b, i, arr) => (arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length ? a : b), null); ////find the most common edge color
        //// check to see edge color is at least 10% of the colors (if not, make background the palette color with most occurrences (palette = ordered from highest->lowest occurrences))
        if (!(pal_hist[background] > 0.1 * pal_hist.reduce((a, b) => a + b, 0))) {
          background = 1; ////most common color according to sorting, +1 (so not strarting from 0)
          // background = palette[0];
        } else {
          background += 1;
        }
        // background += 1; ////(so not strarting from 0)
        colors_arr.push(palette, machine, background, colors_data);
        img.write(motif_path);
        resolve(colors_arr);
      });
    });
  });
  return processImage;
}

module.exports = { getData, colors_arr };

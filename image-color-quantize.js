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
let colors_data = [];

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
  reIndex: false, //?
  // useCache: false, //?
  //FloydSteinberg(-/+), Stucki(++), Atkinson(-), Jarvis(+?), null
  // dithDelta: 1, //new
};

if (palette_opt.length > 0) {
  opts.palette = palette_opt;
}

function getData() {
  const processImage = new Promise((resolve) => {
    Jimp.read(`./out-colorwork-images/colorwork.png`).then((image) => {
      width = image.bitmap.width;
      height = image.bitmap.height;
      data = image.bitmap.data;
      let q = new RgbQuant(opts);
      q.sample(data, width);
      // palette = q.palette(true);
      palette = q.palette(true, true);
      q.idxi32.forEach(function (i32) {
        ////return array of palette color occurrences
        pal_hist.push({ color: q.i32rgb[i32], count: q.histogram[i32] });
        // pal_hist.push(q.histogram[i32]);
      });
      // sort it yourself
      pal_hist.sort(function (a, b) {
        return a.count == b.count ? 0 : a.count < b.count ? 1 : -1;
      });
      ////
      opts.palette = pal_hist.map((el) => (el = el.color));
      pal_hist = pal_hist.map((el) => (el = el.count));
      q = new RgbQuant(opts);
      q.sample(data, width);
      palette = q.palette(true, true);
      /////
      let hex_arr = [];
      const RGBToHex = (r, g, b) => ((r << 16) + (g << 8) + b).toString(16).padStart(6, '0');
      for (let h = 0; h < palette.length; ++h) {
        hex_arr.push(Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255)); //255 bc hex
        colors_data.push(RGBToHex(palette[h][0], palette[h][1], palette[h][2]));
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
          px_map = px_map.map((el) => (el += 1)); ////so starting from 1
          colors_arr.push(px_map); ////make it into an array with rows
          for (let x = 0; x < width; ++x) {
            let hex = hex_arr[px_arr[x]];
            img.setPixelColor(hex, x, y);
          }
        }
        ////assign edge colors higher carrier numbers to prevent pockets
        function sortByFrequency(array) {
          let frequency = {};
          array.forEach(function (value) {
            frequency[value] = 0;
          });
          let uniques = array.filter(function (value) {
            return ++frequency[value] == 1;
          });
          return uniques.sort(function (a, b) {
            return frequency[b] - frequency[a];
          });
        }
        let edge_colors = sortByFrequency(background);
        edge_colors = edge_colors.map((el) => (el += 1)); ////so starting from 1
        background = edge_colors[0];
        if (!(pal_hist[background] > 0.1 * pal_hist.reduce((a, b) => a + b, 0))) {
          background = 1; ////most common color according to sorting, +1 (so not strarting from 0)
        }
        //////
        // let replace = palette.length;
        // move: for (let i = 0; i < edge_colors.length; ++i) { //go back! //?
        //   if (edge_colors[i] === palette.length) {
        //     edge_colors.unshift();
        //     --replace;
        //   } else {
        //     break move;
        //   }
        // }
        for (let i = 1; i <= colors_data.length; ++i) {
          if (!edge_colors.includes(i)) {
            edge_colors.push(i);
          }
        }
        ////
        if (edge_colors.length > 0) {
          /////////
          let new_colors_data = [];
          for (let i = 0; i < edge_colors.length; ++i) {
            new_colors_data.unshift(colors_data[edge_colors[i] - 1]);
          }
          ////
          let replaced_bg = false;
          for (let i = 0; i < edge_colors.length; ++i) {
            edge_colors[i] = [edge_colors[i], edge_colors.length - i];
            if (edge_colors[i][0] === background && !replaced_bg) {
              background = edge_colors[i][1];
              replaced_bg = true;
            }
          }
          colors_data = [...new_colors_data];
          ///////
          // // for (let i = edge_colors.length; i > 0; --i) {
          // for (let i = edge_colors.length - 1; i >= 0; --i) {
          //   if (background === edge_colors[i]) {
          //     // if (background === i) {
          //     background = replace;
          //   } else if (background === replace) {
          //     // background = i;
          //     background = edge_colors[i];
          //   }
          //   let edge = colors_data.splice(edge_colors[i] - 1, 1, colors_data[replace - 1]);
          //   // let edge = colors_data.splice(i - 1, 1, colors_data[replace - 1]);
          //   colors_data.splice(replace - 1, 1, edge[0]);
          // }
          /////
          for (let r = 0; r < colors_arr.length; ++r) {
            for (let i = edge_colors.length - 1; i >= 0; --i) {
              colors_arr[r] = colors_arr[r].map((c) => {
                if (c === edge_colors[i][0]) {
                  return (c = `${edge_colors[i][1]}`); //turn into string so doesn't get replaced later
                } else {
                  return c;
                }
              });
            }
          }
          for (let r = 0; r < colors_arr.length; ++r) {
            colors_arr[r] = colors_arr[r].map((c) => (c = Number(c)));
          }
          /////
          // for (let r = 0; r < colors_arr.length; ++r) {
          //   for (let i = edge_colors.length - 1; i >= 0; --i) {
          //     colors_arr[r] = colors_arr[r].map((c) => {
          //       if (c === edge_colors[i]) {
          //         return (c = replace);
          //       } else if (c === replace) {
          //         return (c = edge_colors[i]);
          //       } else {
          //         return c;
          //       }
          //     });
          //   }
          // }
        }
        for (let h = 1; h <= colors_data.length; ++h) {
          colors_data[h - 1] = `x-vis-color #${colors_data[h - 1]} ${h}`;
        }
        ///
        colors_arr.push(palette, machine, background, colors_data);
        img.write(motif_path);
        resolve(colors_arr);
      });
    });
  });
  return processImage;
}

module.exports = { getData, colors_arr };

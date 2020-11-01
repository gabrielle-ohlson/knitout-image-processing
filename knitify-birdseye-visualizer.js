//TODO: (//? maybe if kniterate machine, make default cast-on waste yarn, and then otherwise, give option?)
//TODO: add option for fair isle and intarsia too (not just jacquard... also maybe ladderback jacquard ?)

//TODO: add visualization of birds eye backing
const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const Jimp = require('jimp');
const imageColors = require('./image-color-quantize.js');
// const { colors_data } = require('./image-color-quantize.js');
let background, machine, palette, color_count, init_dir, other_dir;
let colors_arr = [];
let knitout = [];
let row = [];
let carrier_passes = [];
let carriers_arr = [];
let color_carriers = [];
let rows = [];
let jacquard_passes = [];
let even_bird = [];
let odd_bird = [];
let caston = [];
let pos_caston = [];
let neg_caston = [];
let bindoff = [];
let last_pass_dir, xfer_needle, last_needle, bindoff_carrier;
let colors_data = [];

let carrier_track = [];
const FINDMYCARRIER = ({ CARRIER, DIR }) => ({
  CARRIER,
  DIR,
});

let stitch_number = readlineSync.question(
  chalk`{blue.italic \n(OPTIONAL: press enter to skip this step)} {blue.bold What would you like to set the stitch number as? }`,
  {
    defaultInput: -1,
    limit: Number,
    limitMessage: chalk.red('-- $<lastInput> is not a number.'),
  }
);
stitch_number === '-1' ? console.log(chalk.green(`-- Stitch number: UNSPECIFIED`)) : console.log(chalk.green(`-- Stitch number: ${stitch_number}`));
let speed_number = readlineSync.question(
  chalk`{blue.italic \n(OPTIONAL: press enter to skip this step)} {blue.bold What would you like to set the carriage speed number as?} {blue.italic (valid speeds are 0-15) }`,
  {
    defaultInput: -1,
    limit: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    limitMessage: chalk.red('-- $<lastInput> is not within the accepted range: <0-15>.'),
  }
);
speed_number === '-1' ? console.log(chalk.green(`-- Speed number: UNSPECIFIED`)) : console.log(chalk.green(`-- Speed number: ${speed_number}`));

imageColors
  .getData()
  .then((result) => {
    // colors_arr = result.flat(); //?
    colors_data = result.pop(); //?
    colors_arr = result.flat();
    return result;
  })
  .then(() => {
    // colors_data = colors_arr.pop();
    background = colors_arr.pop();
    machine = colors_arr.pop();
    palette = colors_arr.pop();
    colors_arr = colors_arr.reverse();
    color_count = palette.length;
    // machine.includes('kniterate') ? ((needle_bed = 253), (init_dir = '+'), (other_dir = '-')) : ((needle_bed = 541), (init_dir = '-'), (other_dir = '+')); ////one extra so not counting from 0
    init_dir = '-';
    other_dir = '+';
    machine.includes('kniterate') ? (needle_bed = 253) : (needle_bed = 541); ////one extra so not counting from 0
  })
  .then((dir, needle, carrier) => {
    // let even_bird = [];
    // let odd_bird = [];
    for (let x = 1; x <= colors_arr[0].length; ++x) {
      //new
      x % 2 === 0 ? even_bird.push(x) : odd_bird.push(x);
    }
    for (let y = 0; y < colors_arr.length; ++y) {
      for (let x = 0; x < colors_arr[y].length; ++x) {
        needle = x + 1; ////so counting from 1 not 0
        carrier = colors_arr[y][x];
        row.push([needle, carrier]);
      }
      for (let i = 1; i <= color_count; ++i) {
        let carrier_pass = row.filter((n) => n[1] === i);
        // if (carrier_pass.length === 0) carrier_pass = [['carrier', i]]; //? options for build up on back but true birds eye
        carrier_passes.push(carrier_pass);
        carrier_pass = [];
      }
      // rows.push(carrier_passes); //?
      rows.push(carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length)); ////?keep empty passes ?
      row = [];
      carrier_passes = [];
    }
    let passes_per_row = [];
    for (let i = 0; i < rows.length; ++i) {
      if (i % 2 !== 0) {
        rows[i].reverse();
      }
      passes_per_row.push(rows[i].length);
    }
    jacquard_passes = rows.flat();
    let row_count = 1;
    knitout.push(`;row: ${row_count}`);
    let prev_row = 0;
    let taken;
    let inhook;
    let neg_carrier;
    let back_needles = []; //new
    let draw_thread;
    for (let i = 0; i < jacquard_passes.length; ++i) {
      if (i === prev_row + passes_per_row[row_count - 1]) {
        row_count += 1;
        knitout.push(`;row: ${row_count}`);
        prev_row = i;
        back_needles = [];
      }
      i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);
      carrier = jacquard_passes[i][0][1];
      if (!carrier_track.some((el) => el.CARRIER === carrier)) {
        carrier_track.push(
          FINDMYCARRIER({
            CARRIER: carrier,
            DIR: dir,
          })
        );
      } else {
        let previous = carrier_track.find((obj) => obj.CARRIER === carrier);
        let prev_idx = carrier_track.findIndex((obj) => obj.CARRIER === carrier);
        if (previous.DIR === dir) {
          dir === '+' ? (dir = '-') : (dir = '+');
        }
        carrier_track[prev_idx].DIR = dir;
      }
      ///////
      if (!knitout.some((el) => el === `inhook ${carrier}`) && machine.includes('shima') && carrier !== jacquard_passes[0][0][1]) {
        ////last one is to save inhook & releasehook for caston if first carrier
        knitout.push(`inhook ${carrier}`);
        color_carriers.push(carrier);
        inhook = true;
      }
      const knitoutLines = (x, last) => {
        let front = jacquard_passes[i].find((element) => element[0] === x);
        if (front !== undefined) {
          knitout.push(`knit ${dir} f${front[0]} ${carrier}`);
          taken = true;
        } else {
          taken = false;
        }
        if (i % 2 === 0 && !taken) {
          if (x % 2 !== 0) {
            knitout.push(`knit ${dir} b${x} ${carrier}`);
            back_needles.push(x);
          } else {
            let missing_needles = even_bird.filter((x) => back_needles.indexOf(x) === -1);
            // if (jacquard_passes[i][0][0] === 'carrier' && missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
            if (missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
              knitout.push(`knit ${dir} b${x} ${carrier}`);
            }
          } //?
        }
        if (i % 2 !== 0 && !taken) {
          if (x % 2 === 0) {
            knitout.push(`knit ${dir} b${x} ${carrier}`);
            back_needles.push(x); //new
          } else {
            let missing_needles = odd_bird.filter((x) => back_needles.indexOf(x) === -1);
            // if (jacquard_passes[i][0][0] === 'carrier' && missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
            if (missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
              knitout.push(`knit ${dir} b${x} ${carrier}`);
            }
          }
        }
        if (inhook && x === last) {
          knitout.push(`releasehook ${carrier}`);
          inhook = false;
        }
      };
      if (dir === '+') {
        for (let x = 1; x <= colors_arr[0].length; ++x) {
          knitoutLines(x, colors_arr[0].length);
          if (i === 0 || i === 1) {
            //TODO: determine whether it matters if first pass starts with needle on front bed (todo: alter this since it does)
            x % 2 !== 0 ? pos_caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : pos_caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
          }
        }
      } else {
        for (let x = colors_arr[0].length; x > 0; --x) {
          knitoutLines(x, 1);
          if (i === 0 || i === 1) {
            if (machine.includes('kniterate')) neg_carrier = carrier;
            x % 2 === 0 ? neg_caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : neg_caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
          }
          if (
            machine.includes('kniterate') &&
            carrier !== neg_carrier &&
            draw_thread === undefined &&
            !knitout.some((el) => el.includes(`knit`) && el.includes(` ${carrier}`))
          ) {
            draw_thread = carrier;
          }
        }
      }
    }
    ////////
    let carriers_str = '';
    let max_carriers;
    machine.includes('kniterate') ? (max_carriers = 6) : (max_carriers = 10); //TODO: add more options for this, or maybe take it from command-line input (i.e. stoll machines have anywhere from 8 - 16 carriers [maybe even > || < for some])
    for (let i = 1; i <= max_carriers; ++i) {
      carriers_str = `${carriers_str} ${i}`;
      carriers_arr.push(i);
    }
    if (machine.includes('shima')) {
      caston = [...neg_caston, ...pos_caston];
      caston.unshift(`inhook ${jacquard_passes[0][0][1]}`);
      caston.push(`releasehook ${jacquard_passes[0][0][1]}`);
      knitout.unshift(caston);
    } else if (machine.includes('kniterate')) {
      caston = [...pos_caston, ...neg_caston];
      let waste_stitches;
      if (colors_arr[0].length >= 20) {
        waste_stitches = 20;
      } else {
        waste_stitches = Math.ceil(0.6 * colors_arr[0].length);
        if (waste_stitches < 5) waste_stitches = colors_arr[0].length;
      }
      for (let w = colors_arr[0].length; w > waste_stitches; --w) {
        pos_caston = pos_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
        neg_caston = neg_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
      }
      let kniterate_caston_base = [...pos_caston, ...neg_caston];
      //////
      let kniterate_caston = [];
      colors: for (let i = 0; i <= color_count; ++i) {
        //// <= because add extra one for draw thread
        if (i === 6) {
          break colors;
        }
        carrier = carriers_arr[i];
        color_carriers.push(carrier);
        let yarn_in = `in ${carrier}`;
        let carrier_caston = kniterate_caston_base.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
        i === 0 ? kniterate_caston.push(yarn_in, carrier_caston, carrier_caston) : kniterate_caston.push(yarn_in, carrier_caston);
      }
      if (draw_thread === undefined) draw_thread = color_carriers[color_carriers.length - 1];
      kniterate_caston.push(`;kniterate yarns in`);
      kniterate_caston = kniterate_caston.flat();
      let waste_yarn_section = [];
      carrier = jacquard_passes[0][0][1];
      let waste_yarn = caston.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
      for (let i = 0; i < 35; ++i) {
        ////70 total passes
        waste_yarn_section.push(waste_yarn);
      }
      for (let i = 0; i < 14; ++i) {
        i % 2 !== 0 && i < 13 ? (dir = '-') : (dir = '+');
        if (i === 13) {
          waste_yarn_section.push(`;draw thread: ${draw_thread}`);
        }
        if (dir === '+') {
          for (let x = 1; x <= colors_arr[0].length; ++x) {
            if (i === 13) {
              waste_yarn_section.push(`knit + f${x} ${draw_thread}`); ////draw thread
            } else {
              i !== 12 ? waste_yarn_section.push(`knit + f${x} ${carrier}`) : waste_yarn_section.push(`drop b${x}`);
            }
          }
        } else {
          for (let x = colors_arr[0].length; x > 0; --x) {
            waste_yarn_section.push(`knit - b${x} ${carrier}`);
          }
        }
      }
      // waste_yarn_section.push(`rack 0.5`); //(TODO: determine if this is something we're changing for kniterate backend)
      waste_yarn_section.push(`rack 0.25`); ////aka rack 0.5 for kniterate
      for (let x = 1; x <= colors_arr[0].length; ++x) {
        waste_yarn_section.push(`knit + f${x} ${carrier}`);
        waste_yarn_section.push(`knit + b${x} ${carrier}`);
      }
      waste_yarn_section.push(`rack 0`);
      waste_yarn_section = waste_yarn_section.flat();
      knitout.unshift(waste_yarn_section);
      knitout.unshift(kniterate_caston);
    }
    knitout.unshift(`;background color: ${background}`);
    if (speed_number !== '-1') knitout.unshift(`x-speed-number ${speed_number}`);
    if (stitch_number !== '-1') knitout.unshift(`x-stitch-number ${stitch_number}`);
    knitout.unshift(`;!knitout-2`, `;;Machine: ${machine}`, `;;Carriers:${carriers_str}`);
    bindoff_carrier = knitout[knitout.length - 1].charAt(knitout[knitout.length - 1].length - 1);
    last_needle = colors_arr[0].length;
    knitout[knitout.length - 1].includes('+') ? ((last_pass_dir = '+'), (xfer_needle = last_needle)) : ((last_pass_dir = '-'), (xfer_needle = 1));
  })
  .then(() => {
    //TODO: make sure the bindoff ends ok
    //TODO: add tag at end of bindoff?
    ////bindoff
    bindoff.push(`;bindoff section`);
    let side, double_bed;
    let count = last_needle;
    knitout.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false);
    last_pass_dir === '+' ? (side = 'right') : (side = 'left');
    if (side === 'right') {
      xfer_needle = xfer_needle - count + 1;
    }
    const posLoop = (op, bed) => {
      for (let x = xfer_needle; x < xfer_needle + count; ++x) {
        if (op === 'knit') {
          bindoff.push(`knit + ${bed}${x} ${bindoff_carrier}`);
        }
        if (op === 'xfer') {
          let receive;
          bed === 'f' ? (receive = 'b') : (receive = 'f');
          bindoff.push(`xfer ${bed}${x} ${receive}${x}`);
        }
        if (op === 'bind') {
          bindoff.push(`xfer b${x} f${x}`);
          bindoff.push(`rack -1`);
          bindoff.push(`xfer f${x} b${x + 1}`);
          bindoff.push(`rack 0`);
          bindoff.push(`knit + b${x + 1} ${bindoff_carrier}`); //fixed
        }
      }
    };
    const negLoop = (op, bed) => {
      for (let x = xfer_needle + count - 1; x >= xfer_needle; --x) {
        if (op === 'knit') {
          bindoff.push(`knit - ${bed}${x} ${bindoff_carrier}`);
        }
        if (op === 'xfer') {
          let receive;
          bed === 'f' ? (receive = 'b') : (receive = 'f');
          bindoff.push(`xfer ${bed}${x} ${receive}${x}`);
        }
        if (op === 'bind') {
          bindoff.push(`xfer b${x} f${x}`);
          bindoff.push(`rack 1`);
          bindoff.push(`xfer f${x} b${x - 1}`);
          bindoff.push(`rack 0`);
          bindoff.push(`knit - b${x - 1} ${bindoff_carrier}`);
        }
      }
    };
    if (side === 'left') {
      posLoop('knit', 'f');
      if (double_bed) negLoop('knit', 'f');
      if (double_bed) posLoop('knit', 'b');
      negLoop('xfer', 'f');
      negLoop('knit', 'b');
      posLoop('bind', null);
    } else if (side === 'right') {
      negLoop('knit', 'f');
      if (double_bed) posLoop('knit', 'f');
      if (double_bed) negLoop('knit', 'b');
      posLoop('xfer', 'f');
      posLoop('knit', 'b');
      negLoop('bind', null);
    }
    knitout.push(bindoff);
    knitout = knitout.flat();
    let yarn_out;
    machine.includes('kniterate') ? (yarn_out = 'out') : (yarn_out = 'outhook');
    for (let i = 0; i <= color_carriers.length; ++i) {
      let carrier_search = knitout.map((el) => el.includes(` ${color_carriers[i]}`) && el.includes(`knit`));
      let last = carrier_search.lastIndexOf(true);
      if (last !== -1) {
        knitout.splice(last + 1, 0, `${yarn_out} ${color_carriers[i]}`);
      }
    }
    ///////
    // let birdseye = [...knitout];
    const OP = ({ TYPE, DIR, NEEDLE, CARRIER }) => ({
      TYPE,
      DIR,
      NEEDLE,
      CARRIER,
    });
    let pass_check = [];
    let passes = [];
    let pass = [];
    let rows = [];
    let complete_row = false;
    pass_loop: for (let p = knitout.findIndex((el) => el.includes(';row:')); p < knitout.indexOf(';bindoff section'); ++p) {
      let op_arr = knitout[p].split(' ');
      let type = op_arr[0];
      let dir, needle, carrier, bed;
      if (type.includes('in ') || type.includes('hook') || type.includes('out ')) {
        continue pass_loop;
      }
      if (type.includes(';')) {
        if (type.includes(';row')) {
          complete_row = true;
        } else {
          continue pass_loop;
        }
      }
      if (type !== 'xfer') {
        if (op_arr.length === 4 && (op_arr[1] === '+' || '-')) {
          (dir = op_arr[1]), (needle = op_arr[2]), (carrier = op_arr[3]);
          if (!needle.includes('b')) {
            continue pass_loop;
          } else {
            needle = Number(op_arr[2].slice(1)); //new
          }
        } else {
          continue pass_loop;
        }
      } else {
        continue pass_loop;
      }
      if (pass_check.length > 0 && (pass_check[pass_check.length - 1].DIR !== dir || pass_check[pass_check.length - 1].CARRIER !== carrier)) {
        if (pass_check[pass_check.length - 1].DIR === '-') pass = pass.reverse(); //new
        passes.push(pass);
        if (complete_row) {
          rows.push(passes);
          passes = [];
          complete_row = false;
        }
        pass_check = [];
        pass = [];
        // pass.push(carrier);
        pass.push([needle, carrier]);
      } else {
        pass_check.push(
          OP({
            TYPE: type,
            DIR: dir,
            NEEDLE: needle,
            CARRIER: carrier,
          })
        );
        // pass.push(carrier);
        pass.push([needle, carrier]);
      }
    }
    // console.log(rows[0]); //remove
    // console.log(rows[1]); //remove
    rows = rows.map((passes) => (passes = passes.flat()));
    rows = rows.map((row) => row.sort((a, b) => a[0] - b[0]));
    // console.log(rows[1]); //remove
    let all_needles = [...even_bird, ...odd_bird].sort((a, b) => a - b);
    for (let i = 0; i < rows.length; ++i) {
      let just_needles = [...rows[i]];
      just_needles = just_needles.map((el) => (el = el[0]));
      // let just_needles = rows[i].filter((el) => typeof el === Number);
      let holes = all_needles.filter((x) => just_needles.indexOf(x) === -1);
      if (holes.length > 0) {
        for (h = 0; h < holes.length; ++h) {
          rows[i].push([holes[h], 'x']);
        }
      }
    }
    rows = rows.map((row) => row.sort((a, b) => a[0] - b[0]));
    // console.log(rows[1]); //remove
    // console.log(colors_data); //new
    colors_data = colors_data.map((line) => line.split(' '));
    colors_data.forEach((line) => line.shift());
    // console.log(colors_data);
    /////
    let rgba_arr = colors_data.map((hex) => (hex = Jimp.intToRGBA(Jimp.cssColorToHex(hex[0]))));
    // console.log(rgba_arr); //remove
    // console.log(colors_data); //remove
    //TODO: change name of this to rgbSaturation
    function RGBToHSL(r, g, b) {
      (r /= 255), (g /= 255), (b /= 255);
      //   function getMax(arr) {
      //     let len = arr.length;
      //     let max = -Infinity;
      //     while (len--) {
      //       max = arr[len] > max ? arr[len] : max;
      //     }
      //     return max;
      //   }
      //   function getMin(arr) {
      //     let min = arr[0];
      //     for (let idx = 0; idx < arr.length; ++idx) {
      //       min = arr[idx] < min ? arr[idx] : min;
      //     }
      //     return min;
      //   }
      //   let max = getMax([r, g, b]);
      //   let min = getMin([r, g, b]);
      let max = Math.max(r, g, b),
        min = Math.min(r, g, b);
      let h,
        s,
        l = Math.round((max + min) / 2); //new
      if (max == min) {
        h = s = 0; // achromatic
      } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        s = Math.round(s * 100); //new
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        h = Math.round(h / 60) * 60; ////round to neartest hue
      }
      return [h, s, l];
    }
    // function RGBToHSL(r, g, b) {
    //   r /= 255;
    //   g /= 255;
    //   b /= 255;
    //   let cmin = Math.min(r, g, b),
    //     cmax = Math.max(r, g, b),
    //     delta = cmax - cmin,
    //     h = 0,
    //     s = 0,
    //     l = 0;
    //   if (delta == 0) h = 0;
    //   else if (cmax == r) h = ((g - b) / delta) % 6;
    //   else if (cmax == g) h = (b - r) / delta + 2;
    //   else h = (r - g) / delta + 4;
    //   h = Math.round(h * 60);
    //   if (h < 0) h += 360;
    //   l = (cmax + cmin) / 2;
    //   s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    //   s = +(s * 100).toFixed(1);
    //   l = +(l * 100).toFixed(1);
    //   return s;
    //   // return 'hsl(' + h + ',' + s + '%,' + l + '%)';
    // }
    let HSL_arr = [];
    rgba_arr = rgba_arr.map((obj) => (obj = Object.values(obj)));
    console.log(rgba_arr);
    console.log(rgba_arr[0][0]);
    for (let h = 0; h < rgba_arr.length; ++h) {
      HSL_arr.push(RGBToHSL(rgba_arr[h][0], rgba_arr[h][1], rgba_arr[h][2]));
    }
    console.log(HSL_arr);
    //TODO: invertHex for color with highest HSL S (saturation) (need to do function to find highest value)
    //TODO: then, in invertHex func, make it colors_data[HSL_arr.indexOf(highest_sat)]
    // TODO: then, fix the bottom stuff, and change ones with carrier 'x' to have value of invertHex
    ///////
    function mostSaturated(arr) {
      if (arr.length === 0) {
        return -1;
      }
      let max = arr[0][1];
      let maxIndex = 0;
      for (let i = 1; i < arr.length; i++) {
        if (arr[i][1] > max) {
          maxIndex = i;
          max = arr[i][1];
        }
      }
      return maxIndex;
    }
    let saturated = mostSaturated(HSL_arr);
    if (saturated > 180) saturated *= -1;
    console.log(saturated);
    function contrastColor() {
      let h = HSL_arr[saturated][0];
      let s = HSL_arr[saturated][1];
      let l = HSL_arr[saturated][2];
      let cc;
      if (h === 0 && s === 0) {
        l === 0 ? (cc = [0, 0, 100]) : (cc = [0, 0, 0]);
      } else {
        if (h > 180) h *= -1;
        cc = [h + 180, s, l];
      }
      return cc;
    }
    let contrast_color = contrastColor();
    console.log(contrast_color);
    // contrast_color = Jimp.cssColorToHex({ h: contrast_color[0], s: contrast_color[1], l: contrast_color[2] });
        contrast_color = Jimp.cssColorToHex({ h: contrast_color[0], s: contrast_color[1] / 100, l: contrast_color[2] / 100 });
    console.log(contrast_color);
    // console.log(Jimp.cssColorToHex(contrast_color[0], contrast_color[1], contrast_color[2]));
    // console.log(Jimp.cssColorToHex({ h: contrast_color[0], s: contrast_color[1] / 100, l: contrast_color[2] / 100 }));
    // console.log(Jimp.cssColorToHex({ h: contrast_color[0], s: contrast_color[1], l: contrast_color[2] }));
    // console.log(Jimp.cssColorToHex(`contrast_color[0]`, `contrast_color[1]`, `contrast_color[2]`));
    // console.log(Jimp.cssColorToHex({ H: contrast_color[0], S: contrast_color[1] / 100, L: contrast_color[2] / 100 }));
    // console.log(Jimp.cssColorToHex(`contrast_color[0]`, `contrast_color[1]%`, `contrast_color[2]%`));
    // function invertHex(hex) {
    //   return (Number(`0x1${hex}`) ^ 0xffffff).toString(16).substr(1).toUpperCase();
    // }
    // let no_hash = colors_data[saturated][0].slice(1);
    // console.log(no_hash);
    // let contrast_color = invertHex(no_hash); // Returns FF00FF
    // console.log(contrast_color);
    //////
    colors_data = colors_data.map((hex) => (hex = [Jimp.cssColorToHex(hex[0]), hex[1]]));
    colors_data.push([contrast_color, 'x']);
    console.log(colors_data);
    // rows = rows.flat();
    console.log(rows[0]); //remove
    console.log(colors_data.find((c) => c[1] == '3')[1]);
    rows = rows.map((pass) => (pass = pass.map((el) => (el = colors_data.find((c) => c[1] == el[1])[0]))));
    // passes = passes.map((pass) => (pass = pass.map((el) => (el[1] = colors_data.find((c) => c[1] == el[1])[0]))));
    // console.log(rows); //remove
    new Jimp(rows[0].length, rows.length, (err, img) => {
      if (err) throw err;
      for (let y = 0; y < rows.length; ++y) {
        for (let x = 0; x < rows[y].length; ++x) {
          img.setPixelColor(rows[y][x], x, y);
        }
      }
      img.write('birdseye.png');

      //   for (let y = 0; y < height; ++y) {
      //     let px_arr = reduced.splice(0, width);
      //     background.push(px_arr[0], px_arr[px_arr.length - 1]); ////push edge colors to background array
      //     let px_map = [...px_arr];
      //     px_map = px_map.map((el) => (el += 1));
      //     colors_arr.push(px_map); ////make it into an array with rows
      //     for (let x = 0; x < width; ++x) {
      //       let hex = hex_arr[px_arr[x]];
      //       img.setPixelColor(hex, x, y);
      //     }
      //   }
      //   background = background.reduce((a, b, i, arr) => (arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length ? a : b), null); ////find the most common edge color
      //   //// check to see edge color is at least 10% of the colors (if not, make background the palette color with most occurrences (palette = ordered from highest->lowest occurrences))
      //   if (!(pal_hist[background] > 0.1 * pal_hist.reduce((a, b) => a + b, 0))) {
      //     background = palette[0];
      //   }
      //   background += 1; ////(so not strarting from 0)
      //   colors_arr.push(palette, machine, background);
      //   img.write(motif_path);
      //   resolve(colors_arr);
    });
  })
  //////
  .finally(() => {
    let knitout_str = JSON.stringify(knitout)
      .replace(/\[|\]|"/gi, '')
      .split(',');
    knitout_str = knitout_str.join('\n');
    readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nSave as: ') });
    let new_file, overwrite;
    readlineSync.promptLoop(function (input) {
      new_file = input;
      if (fs.existsSync(`./knit-out-files/${input}`) || fs.existsSync(`./knit-out-files/${input}.k`)) {
        overwrite = readlineSync.keyInYNStrict(
          chalk.black.bgYellow(`! WARNING:`) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`
        );
        return overwrite;
      }
      if (!fs.existsSync(`./knit-out-files/${input}`)) {
        return !fs.existsSync(`./knit-out-files/${input}.k`);
      }
    });
    if (new_file.includes('.')) new_file = new_file.slice(0, new_file.indexOf('.'));
    console.log(chalk.green(`-- Saving new file as: ${new_file}`)); //TODO: fix this so removes wrong extension prior
    readlineSync.setDefaultOptions({ prompt: '' });
    // if (new_file.includes('.')) new_file = new_file.slice(0, new_file.indexOf('.'));
    fs.writeFile(`./knit-out-files/${new_file}.k`, knitout_str, function (err) {
      if (err) return console.log(err);
      console.log(
        chalk`{green \nThe knitout file has successfully been written and can be found in the 'knit-out-files' folder.\nOpen 'knit_motif.png'} {green.italic (located in the 'out-colorwork-images' folder)} {green to see a visual depiction of the knitting instructions.} {green.italic This folder also contains: 'colorwork.png', which depicts the resized image. Please note that, if applicable, the program has renamed files in that folder from earlier sessions, by appending a number to the end.)} {bold.bgGray.underline \n*** If you would like to add shaping to the file next, type 'npm run shapeify'}`
      );
    });
  });

//TODO: maybe add error check for this one too?

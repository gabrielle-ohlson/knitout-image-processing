//TODO: add option to count the # of needles in a row on front bed and if a lot, split it up in 2-3 passes
//TODO: add option for fair isle too (not just jacquard... also maybe ladderback jacquard ?)

const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const imageColors = require('./image-color-quantize.js');
let background, machine, palette, color_count, init_dir, other_dir, draw_thread, double_bed;
let colors_arr = [];
let knitout = [];
let row = [];
let carrier_passes = [];
let carriers_arr = [];
let color_carriers = [];
let rows = [];
let jacquard_passes = [];
let all_needles = [];
let even_bird = [];
let odd_bird = [];
let caston = [];
let pos_caston = [];
let neg_caston = [];
let bindoff = [];
let last_pass_dir, xfer_needle, last_needle, bindoff_carrier;
let colors_data = [];

let kniterate_caston = [],
  waste_yarn_section = [];

let edge_L = [],
  edge_R = [],
  edge_needlesL = [],
  edge_needlesR = [],
  edgeL_done = false,
  edgeR_done = false;

let carrier_track = [],
  initial_carriers = [];
const FINDMYCARRIER = ({ CARRIER, DIR }) => ({
  CARRIER,
  DIR,
});
let track_back = [];

let stitch_number = readlineSync.question(chalk`{blue.italic \n(OPTIONAL: press enter to skip this step)} {blue.bold What would you like to set the stitch number as? }`, {
  defaultInput: -1,
  limit: Number,
  limitMessage: chalk.red('-- $<lastInput> is not a number.'),
});
stitch_number === '-1' ? console.log(chalk.green(`-- Stitch number: UNSPECIFIED`)) : console.log(chalk.green(`-- Stitch number: ${stitch_number}`));
let speed_number = readlineSync.question(
  chalk`{blue.italic \n(OPTIONAL: press enter to skip this step)} {blue.bold What would you like to set the carriage speed number as?} {blue.italic (valid speeds are between <0-600>) }`,
  {
    defaultInput: -1,
    limit: function (input) {
      return (Number(input) >= 0 && Number(input) <= 600) || Number(input) === -1;
    },
    limitMessage: chalk.red('-- $<lastInput> is not within the accepted range: <0-600>.'),
    // limit: [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    // limitMessage: chalk.red('-- $<lastInput> is not within the accepted range: <0-15>.'),
  }
);
speed_number === '-1'
  ? (console.log(chalk.green(`-- Speed number: UNSPECIFIED, will assign default value [100]`)), (speed_number = 100))
  : console.log(chalk.green(`-- Speed number: ${speed_number}`));

let back_style = ['Default', 'Birdseye', 'Minimal', 'Secure'],
  style = readlineSync.keyInSelect(
    back_style,
    chalk`{blue.bold ^What style back would you like to use?} {blue.italic \n=> '}{blue.bold Birdseye}{blue.italic ' is not recommended for pieces that use more than 3 colors due to the build up of extra rows the method creates on the back bed.\n=> Alternatively, '}{blue.bold Minimal}{blue.italic ' creates a reasonably even ratio of front to back rows, resulting in the least amount of build up on the back.\n=> '}{blue.bold Default}{blue.italic ' is an in-between option that is similar to Birdseye, but more suitable for pieces containing up to 5 colors.\n=> '}{blue.bold Secure}{blue.italic ' is the 'Minimal' option, with additional knits on the side needles for extra security.}`
  );
console.log(chalk.green('-- Back style: ' + back_style[style]));
back_style = back_style[style];

let reverse;
back_style === 'Minimal' ? (reverse = false) : (reverse = true);

let rib = false,
  rib_arr = [],
  rib_bottom = [],
  ribB_rows,
  rib_top = [],
  ribT_rows,
  bot_dir_switch = false;

imageColors
  .getData()
  .then((result) => {
    colors_arr = result;
    return result;
  })
  .then(() => {
    colors_data = colors_arr.pop();
    background = colors_arr.pop();
    machine = colors_arr.pop();
    palette = colors_arr.pop();
    colors_arr = colors_arr.reverse();
    color_count = palette.length;
    init_dir = '-';
    other_dir = '+';
    machine.includes('kniterate') ? (needle_bed = 253) : (needle_bed = 541); ////one extra so not counting from 0
    /////
    if ((back_style === 'Secure' || back_style === 'Minimal') && palette.length < 3) {
      //TODO: fix secure and minimal so doesn't have issue of not pushing taken needles to next carrier pass
      back_style = 'Default';
      console.log(
        `Changing backstyle to 'Default' due to bug that arises when using < 3 colors & either the 'Minimal' or 'Secure' backstyle.\nPlanning to resolve this issue soon.`
      );
    }
    //////
    if (back_style === 'Secure') {
      reverse = false;
      if (palette.length < 4) {
        back_style = 'Minimal';
      } else {
        edge_L.push(3, 1, 2);
        ////
        if (palette.length === 3 || palette.length === 6) {
          if (colors_arr[0].length % palette.length === 0 || colors_arr[0].length % palette.length === 2) {
            edge_R.push(colors_arr[0].length, colors_arr[0].length - 2, colors_arr[0].length - 1);
          } else if (colors_arr[0].length % palette.length === 5 || colors_arr[0].length % palette.length === 3) {
            edge_R.push(colors_arr[0].length - 2, colors_arr[0].length - 1, colors_arr[0].length);
          } else if (colors_arr[0].length % palette.length === 4 || colors_arr[0].length % palette.length === 1) {
            edge_R.push(colors_arr[0].length - 1, colors_arr[0].length, colors_arr[0].length - 2);
          } else {
            edge_R.push(colors_arr[0].length, colors_arr[0].length - 1, colors_arr[0].length - 2);
          }
        } else if (palette.length === 4) {
          if (colors_arr[0].length % palette.length === 0) {
            edge_R.push(colors_arr[0].length, colors_arr[0].length - 1, colors_arr[0].length - 2);
          } else if (colors_arr[0].length % palette.length === 1) {
            edge_R.push(colors_arr[0].length - 1, colors_arr[0].length, colors_arr[0].length - 2);
          } else if (colors_arr[0].length % palette.length === 2) {
            edge_R.push(colors_arr[0].length - 2, colors_arr[0].length - 1, colors_arr[0].length);
          } else {
            edge_R.push(colors_arr[0].length, colors_arr[0].length - 2, colors_arr[0].length - 1);
          }
        } else {
          if (colors_arr[0].length % palette.length === 0) {
            edge_R.push(colors_arr[0].length, colors_arr[0].length - 1, colors_arr[0].length - 2);
          } else if (colors_arr[0].length % palette.length === 2) {
            edge_R.push(colors_arr[0].length - 2, colors_arr[0].length - 1, colors_arr[0].length);
          } else if (colors_arr[0].length % palette.length === 3) {
            edge_R.push(colors_arr[0].length, colors_arr[0].length - 2, colors_arr[0].length - 1);
          } else {
            edge_R.push(colors_arr[0].length - 1, colors_arr[0].length, colors_arr[0].length - 2);
          }
        }
      }
    }
    /////
    if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to add rib?}`)) {
      rib = true;
      for (let r = 0; r < color_count; ++r) {
        let data = colors_data[r].split(' ');
        rib_bottom.push(data[1]);
      }
      rib_top = [...rib_bottom];
      if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to add ribbing to the bottom of the piece?}`)) {
        rib_bottom,
          (rib_carrier = readlineSync.keyInSelect(
            rib_bottom,
            chalk`{blue.bold ^Which carrier would you like to use for the bottom rib?} {blue.italic (the corresponding hex code is listed next to each carrier number)}`
          )); //TODO: add option for using a carrier that is not used in piece if <6 carriers in use
        rib_bottom = rib_carrier + 1;
        ribB_rows = readlineSync.questionInt(chalk`{blue.bold \nHow many rows? }`);
      } else {
        rib_bottom = null;
      }
      /////
      if (readlineSync.keyInYNStrict(chalk`{blue.bold \nWould you like to add ribbing to the top of the piece?}`)) {
        rib_top,
          (rib_carrier = readlineSync.keyInSelect(
            rib_top,
            chalk`{blue.bold ^Which carrier would you like to use for the top rib?} {blue.italic (the corresponding hex code is listed next to each carrier number)}`
          ));
        rib_top = rib_carrier + 1;
        ribT_rows = readlineSync.questionInt(chalk`{blue.bold \nHow many rows? }`);
      } else {
        rib_top = null;
      }
    } else {
      rib_bottom = null;
      rib_top = null;
    }
  })
  .then((dir, needle, carrier) => {
    for (let x = 1; x <= colors_arr[0].length; ++x) {
      all_needles.push(x);
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
        if (carrier_pass.length === 0 && back_style === 'Birdseye') carrier_pass = [['carrier', i]]; //? options for build up on back but true birds eye
        carrier_passes.push(carrier_pass);
        carrier_pass = [];
      }
      if (back_style === 'Birdseye') {
        rows.push(carrier_passes);
      } else {
        carrier_passes = carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length); ////?keep empty passes ?
        if (carrier_passes.length === 1) {
          carrier_passes.push([[]]);
        }
        rows.push(carrier_passes);
      }
      row = [];
      carrier_passes = [];
    }
    let passes_per_row = [];
    let extra_back6 = 0; //new
    for (let i = 0; i < rows.length; ++i) {
      if (i % 2 !== 0 && reverse) {
        rows[i].reverse();
      }
      passes_per_row.push(rows[i].length);
    }
    jacquard_passes = rows.flat();
    let row_count = 1;
    let pass_count = 0;
    let leftovers = [],
      leftovers2 = [];
    knitout.push(`;row: ${row_count}`);
    if (passes_per_row[row_count - 1] >= 5) {
      //// - 1 since starting from 1 not 0 for row count
      knitout.push(`x-roller-advance 0`);
    }
    ///
    let prev_row = 0;
    let taken, inhook, neg_carrier, end_needle, dir_caston;
    let back_needles = [];
    /////
    const ODD_CASTON = (x, dir, dir_caston) => {
      x % 2 !== 0 ? dir_caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : dir_caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
    };
    const EVEN_CASTON = (x, dir, dir_caston) => {
      x % 2 === 0 ? dir_caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : dir_caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
    };
    //////
    for (let i = 0; i < jacquard_passes.length; ++i) {
      let single_color = false;
      /////new
      let back_mod;
      passes_per_row[row_count - 1] < 6 && back_style === 'Secure' ? (back_mod = passes_per_row[row_count - 1]) : (back_mod = 5);
      //////
      if (i === prev_row + passes_per_row[row_count - 1]) {
        //////new
        if (passes_per_row[row_count - 1] === 6) {
          extra_back6 < 4 ? ++extra_back6 : (extra_back6 = 0);
        }
        /////
        pass_count = 0;
        row_count += 1;
        knitout.push(`;row: ${row_count}`);
        if (passes_per_row[row_count - 1] >= 5) {
          //// - 1 since starting from 1 not 0 for row count
          knitout.push(`x-roller-advance 0`);
        } else if (passes_per_row[row_count - 1] < 5 && passes_per_row[row_count - 2] >= 5) {
          knitout.push(`x-roller-advance 100`);
        }
        //
        prev_row = i;
        back_needles = [];
      }
      if ((passes_per_row[row_count - 1] === 6 && pass_count === 5) || (passes_per_row[row_count - 1] === 5 && pass_count === 4)) {
        knitout.push(`x-roller-advance 450`);
      }
      i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);
      if (jacquard_passes[i][0].length > 0) {
        carrier = jacquard_passes[i][0][1];
      } else {
        single_color = true;
        carrier = jacquard_passes[i - 1][0][1];
        if (carrier === undefined) carrier = jacquard_passes[i - 2][0][1]; //TODO: make this work for birdseye too
      }
      ////
      if (!carrier_track.some((el) => el.CARRIER === carrier)) {
        carrier_track.push(
          FINDMYCARRIER({
            CARRIER: carrier,
            DIR: dir,
          })
        );
        initial_carriers.push(
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
        ////
        let stack_track = carrier_track.filter((obj) => obj.DIR === dir);
        if (stack_track.length > 3) {
          let least_freq;
          if (track_back.length > 0) {
            if (track_back.length < color_count) {
              for (let t = 0; t < stack_track.length; ++t) {
                if (!track_back.includes(stack_track[t].CARRIER)) {
                  least_freq = stack_track[t].CARRIER;
                  break;
                }
              }
            }
            if (least_freq === undefined) {
              let track_back_dir = track_back.filter((el) => stack_track.some((c) => c.CARRIER === el));
              least_freq = [
                ...track_back_dir.reduce(
                  (
                    r,
                    n // create a map of occurrences
                  ) => r.set(n, (r.get(n) || 0) + 1),
                  new Map()
                ),
              ].reduce((r, v) => (v[1] < r[1] ? v : r))[0]; // get the the item that appear less times
            }
          } else {
            least_freq = stack_track[0].CARRIER;
          }
          track_back.push(least_freq);
          let track_dir;
          dir === '+' ? (track_dir = '-') : (track_dir = '+');
          if (!carrier_track.some((el) => el.CARRIER === least_freq)) {
            carrier_track.push(
              FINDMYCARRIER({
                CARRIER: least_freq,
                DIR: track_dir,
              })
            );
            initial_carriers.push(
              FINDMYCARRIER({
                CARRIER: least_freq,
                DIR: track_dir,
              })
            );
          } else {
            let least_idx = carrier_track.findIndex((obj) => obj.CARRIER === least_freq);
            carrier_track[least_idx].DIR = track_dir;
          }
          if (track_dir === '+') {
            for (let t = 1; t < colors_arr[0].length; ++t) {
              if (t === 1 || t === colors_arr[0].length - 1 || t % Number(least_freq) === 0) {
                knitout.push(`knit + b${t} ${least_freq}`);
              }
            }
          } else {
            for (let t = colors_arr[0].length; t >= 1; --t) {
              if (t === 1 || t === colors_arr[0].length - 1 || t % Number(least_freq) === 0) {
                knitout.push(`knit - b${t} ${least_freq}`);
              }
            }
          }
        }
        ////
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
        if (single_color) {
          knitout.push(`knit ${dir} b${x} ${carrier}`);
          back_needles.push(x); //check //remove //? or keep? //TODO: maybe add this for Secure/Minimal?
        } else {
          if (back_style === 'Ladderback') {
            if (!taken) {
              let missing_needles = [];
              if (i === prev_row + passes_per_row[row_count - 1] - 1) missing_needles = all_needles.filter((x) => back_needles.indexOf(x) === -1);
              if (i % 4 === 0) {
                if (x % 4 === 1) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                  back_needles.push(x);
                } else {
                  if (missing_needles.includes(x)) {
                    knitout.push(`knit ${dir} b${x} ${carrier}`);
                  }
                }
              } else if (i % 4 === 1) {
                if (x % 4 === 2) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                  back_needles.push(x);
                } else {
                  if (missing_needles.includes(x)) {
                    knitout.push(`knit ${dir} b${x} ${carrier}`);
                  }
                }
              } else if (i % 4 === 2) {
                if (x % 4 === 3) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                  back_needles.push(x);
                } else {
                  if (missing_needles.includes(x)) {
                    knitout.push(`knit ${dir} b${x} ${carrier}`);
                  }
                }
              } else if (i % 4 === 3) {
                if (x % 4 === 0) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                  back_needles.push(x);
                } else {
                  if (missing_needles.includes(x)) {
                    knitout.push(`knit ${dir} b${x} ${carrier}`);
                  }
                }
              }
            }
          } else if (back_style === 'Minimal' || back_style === 'Secure') {
            if (back_style === 'Secure') {
              if (pass_count === 5) pass_count = extra_back6; //new //come back! //?
              if (edge_needlesL.length === 0) edge_needlesL = [...edge_L];
              if (edge_needlesR.length === 0) edge_needlesR = [...edge_R];
            }
            if ((dir === '+' && x === 1) || (dir === '-' && x === colors_arr[0].length)) {
              // console.log(`reset: leftovers = ${leftovers}, leftovers2 = ${leftovers2}`); //remove
              leftovers2 = [...new Set([...leftovers2, ...leftovers])];
              leftovers = [];
              // console.log(`reset: leftovers2 = ${leftovers2}`); //remove
              edgeL_done = false;
              edgeR_done = false;
            }
            if (back_style === 'Secure' && (edge_L.includes(x) || edge_R.includes(x))) {
              if (!taken) {
                if (!edgeL_done && edge_L.includes(x)) {
                  if (pass_count <= 3 && x % back_mod === pass_count) {
                    //new //?
                    // if (pass_count <= 3 && x % passes_per_row[row_count - 1] === pass_count) { //go back! //?
                    knitout.push(`knit ${dir} b${x} ${carrier}`);
                    if (edge_needlesL.includes(x)) edge_needlesL.splice(edge_needlesL.indexOf(x), 1);
                    edgeL_done = true;
                  } else if (x === edge_needlesL[0]) {
                    knitout.push(`knit ${dir} b${edge_needlesL[0]} ${carrier}`);
                    edge_needlesL.shift();
                    edgeL_done = true;
                  }
                  ////
                  if (leftovers2.includes(x)) {
                    leftovers2.splice(leftovers2.indexOf(x), 1);
                  }
                } else if (!edgeR_done && edge_R.includes(x)) {
                  if (pass_count <= 3 && x % back_mod === pass_count) {
                    //new //?
                    // if (pass_count <= 3 && x % passes_per_row[row_count - 1] === pass_count) { //go back! //?
                    knitout.push(`knit ${dir} b${x} ${carrier}`);
                    if (edge_needlesR.includes(x)) edge_needlesR.splice(edge_needlesR.indexOf(x), 1);
                    edgeR_done = true;
                  } else if (x === edge_needlesR[0]) {
                    knitout.push(`knit ${dir} b${edge_needlesR[0]} ${carrier}`);
                    edge_needlesR.shift();
                    edgeR_done = true;
                  }
                  ////
                  if (leftovers2.includes(x)) {
                    leftovers2.splice(leftovers2.indexOf(x), 1);
                  }
                }
              } else {
                edge_needlesL.includes(x) ? (edgeL_done = true) : (edgeR_done = true);
              }
            } else {
              if (x % back_mod === pass_count) {
                //new //?
                // if (x % passes_per_row[row_count - 1] === pass_count) { //go back! //?
                if (!taken) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                  if (leftovers2.includes(x)) {
                    leftovers2.splice(leftovers2.indexOf(x), 1);
                  }
                } else {
                  leftovers.push(x);
                }
              } else if (leftovers2.includes(x)) {
                // console.log(leftovers2); //remove
                if (!taken) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                  leftovers2.splice(leftovers2.indexOf(x), 1);
                }
              }
            }
          } else {
            if (i % 2 === 0 && !taken) {
              if (x % 2 !== 0) {
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                back_needles.push(x);
              } else {
                let missing_needles = even_bird.filter((x) => back_needles.indexOf(x) === -1);
                if (missing_needles.includes(x) && i === prev_row + passes_per_row[row_count - 1] - 1) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                }
              }
            }
            if (i % 2 !== 0 && !taken) {
              if (x % 2 === 0) {
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                back_needles.push(x);
              } else {
                let missing_needles = odd_bird.filter((x) => back_needles.indexOf(x) === -1);
                if (missing_needles.includes(x) && i === prev_row + passes_per_row[row_count - 1] - 1) {
                  knitout.push(`knit ${dir} b${x} ${carrier}`);
                }
              }
            }
          }
          if (x === end_needle && !taken && !knitout[knitout.length - 1].includes(`b${end_needle}`)) {
            knitout.push(`miss ${dir} f${x} ${carrier}`);
          }
        }
        if (inhook && x === last) {
          knitout.push(`releasehook ${carrier}`);
          inhook = false;
        }
      };
      if (dir === '+') {
        for (let x = 1; x <= colors_arr[0].length; ++x) {
          end_needle = colors_arr[0].length;
          knitoutLines(x, colors_arr[0].length);
          if (i === 0 || i === 1) {
            machine.includes('kniterate') || (machine.includes('shima') && colors_arr[0].length % 2 === 0) ? ODD_CASTON(x, dir, pos_caston) : EVEN_CASTON(x, dir, pos_caston);
          }
        }
      } else {
        for (let x = colors_arr[0].length; x > 0; --x) {
          end_needle = 1;
          knitoutLines(x, 1);
          if (i === 0 || i === 1) {
            machine.includes('kniterate') || (machine.includes('shima') && colors_arr[0].length % 2 === 0)
              ? ((neg_carrier = carrier), EVEN_CASTON(x, dir, neg_caston))
              : ODD_CASTON(x, dir, neg_caston);
          }
        }
      }
      ++pass_count;
    }
    ////////
    knitout.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false); //TODO: make this not fake (maybe add option for single bed?)
    ///
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
      ///
      caston = [...pos_caston, ...neg_caston]; ////so, if not less than 20, this section is length of real section
      let waste_stitches = 20;
      for (let w = colors_arr[0].length; w > waste_stitches; --w) {
        pos_caston = pos_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
        neg_caston = neg_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
      }
      ////
      if (colors_arr[0].length < 20) {
        for (let x = colors_arr[0].length + 1; x <= 20; ++x) {
          x % 2 === 0 ? pos_caston.push(`knit + b${x} ${jacquard_passes[0][0][1]}`) : pos_caston.push(`knit + f${x} ${jacquard_passes[0][0][1]}`);
          x % 2 !== 0 ? neg_caston.unshift(`knit - b${x} ${jacquard_passes[0][0][1]}`) : neg_caston.unshift(`knit - f${x} ${jacquard_passes[0][0][1]}`);
        }
        caston = [...pos_caston, ...neg_caston];
      }
      ////
      draw: for (let i = initial_carriers.length - 1; i >= 0; --i) {
        //start neg so drawthread is farthest away from that color in piece
        if (initial_carriers[i].DIR === '-' && initial_carriers[i].CARRIER != neg_carrier && initial_carriers[i].CARRIER != rib_bottom) {
          draw_thread = initial_carriers[i].CARRIER;
          break draw;
        }
      }
      colors: for (let i = 0; i <= color_count; ++i) {
        //// <= because add extra one for draw thread
        if (draw_thread !== undefined && i === color_count) {
          break colors;
        }
        if (i === 6) {
          ////bc if all carriers in use, definitely don't have extra carrier for drawthread
          break colors;
        }
        carrier = carriers_arr[i];
        color_carriers.push(carrier);
        let yarn_in = `in ${carrier}`;
        let pos_carrier_caston = [];
        let neg_carrier_caston = [];
        let b = 'f';
        if (colors_arr[0].length >= 20) {
          for (let n = Number(carrier); n <= colors_arr[0].length; n += carriers_arr.length) {
            pos_carrier_caston.push(`knit + ${b}${n} ${carrier}`);
            b === 'f' ? (b = 'b') : (b = 'f');
            neg_carrier_caston.unshift(`knit - ${b}${n} ${carrier}`);
          }
          if (Number(carrier) !== 1) neg_carrier_caston.push(`miss - f1 ${carrier}`);
        } else {
          if (colors_arr[0].length < 20) {
            for (let n = 1; n <= colors_arr[0].length; ++n) {
              pos_carrier_caston.push(`knit + ${b}${n} ${carrier}`);
              b === 'f' ? (b = 'b') : (b = 'f');
              neg_carrier_caston.unshift(`knit - ${b}${n} ${carrier}`);
            }
          }
        }
        ////
        let caston_count;
        colors_arr[0].length < 40 ? (caston_count = 3) : (caston_count = 2);
        kniterate_caston.push(yarn_in); //TODO: add extra pos pass for carriers that start in neg direction, so don't need to worry about back pass (make sure this doesn't impact waste yarn & draw thread carriers tho)
        for (let p = 0; p < caston_count; ++p) {
          kniterate_caston.push(pos_carrier_caston, neg_carrier_caston);
        }
        /////
        if (
          i < color_count &&
          carrier !== jacquard_passes[0][0][1] &&
          carrier !== draw_thread &&
          carrier !== rib_bottom &&
          initial_carriers[initial_carriers.findIndex((el) => el.CARRIER === carrier)].DIR === '-'
        ) {
          if (!pos_carrier_caston[pos_carrier_caston.length - 1].includes(colors_arr[0].length)) pos_carrier_caston.push(`miss + f${colors_arr[0].length} ${carrier}`);
          kniterate_caston.push(pos_carrier_caston);
        }
      }
      let backpass_draw = false;
      let backpass = [];
      if (draw_thread === undefined) {
        draw_thread = color_carriers[color_carriers.length - 1];
        if (color_carriers.length === color_count) backpass_draw = true; ////so only if draw_thread is used in piece
      }
      kniterate_caston.push(`;kniterate yarns in`);
      kniterate_caston = kniterate_caston.flat();
      carrier = jacquard_passes[0][0][1];
      let waste_yarn = caston.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
      waste_yarn_section.push(`x-roller-advance 150`);
      for (let i = 0; i < 35; ++i) {
        ////70 total passes
        waste_yarn_section.push(waste_yarn);
      }
      ////
      if (colors_arr[0].length < 20) {
        waste_yarn_section.push(`x-roller-advance 50`);
        for (let i = 0; i < 2; ++i) {
          for (let x = colors_arr[0].length + 1; x <= 20; ++x) {
            waste_yarn_section.push(`drop f${x}`);
          }
          for (let x = 20; x > colors_arr[0].length; --x) {
            waste_yarn_section.push(`drop b${x}`);
          }
        }
        waste_yarn_section.push(`;dropped extra needles`);
      }
      /////
      waste_yarn_section.push(`x-roller-advance 100`);
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
            if (i < 11 || rib_bottom === null || carrier === rib_bottom) waste_yarn_section.push(`knit - b${x} ${carrier}`);
            if (backpass_draw && i === 12 && x % 2 !== 0) {
              backpass.push(`knit - b${x} ${draw_thread}`);
            }
          }
        }
      }
      ////
      waste_yarn_section.push(`rack 0.25`); ////aka rack 0.5 for kniterate
      if (rib_bottom !== null && carrier !== rib_bottom) carrier = rib_bottom;
      for (let x = 1; x <= colors_arr[0].length; ++x) {
        waste_yarn_section.push(`knit + f${x} ${carrier}`);
        waste_yarn_section.push(`knit + b${x} ${carrier}`);
      }
      waste_yarn_section.push(`rack 0`);
      ////
      if (backpass_draw) waste_yarn_section.push(backpass);
      waste_yarn_section = waste_yarn_section.flat();
    }
    const RIB = (arr, carrier, dir1, dir2, rib_rows) => {
      const POSRIB = (bed, modulo) => {
        let bed2;
        bed === 'f' ? (bed2 = 'b') : (bed2 = 'f');
        for (let n = 1; n <= colors_arr[0].length; ++n) {
          if (modulo === 'even') {
            if (n % 2 === 0) arr.push(`knit + ${bed}${n} ${carrier}`);
          } else if (modulo === 'odd') {
            if (n % 2 !== 0) arr.push(`knit + ${bed}${n} ${carrier}`);
          } else if (modulo === 'alt') {
            if (n % 2 !== 0) {
              arr.push(`knit + b${n} ${carrier}`);
            } else {
              arr.push(`knit + f${n} ${carrier}`);
            }
          } else {
            arr.push(`knit + ${bed}${n} ${carrier}`);
          }
        }
      };
      const NEGRIB = (bed, modulo) => {
        for (let n = colors_arr[0].length; n >= 1; --n) {
          if (modulo === 'even') {
            if (n % 2 === 0) arr.push(`knit - ${bed}${n} ${carrier}`);
          } else if (modulo === 'odd') {
            if (n % 2 !== 0) arr.push(`knit - ${bed}${n} ${carrier}`);
          } else if (modulo === 'alt') {
            if (n % 2 !== 0) {
              arr.push(`knit - b${n} ${carrier}`);
            } else {
              arr.push(`knit - f${n} ${carrier}`);
            }
          } else {
            arr.push(`knit - ${bed}${n} ${carrier}`);
          }
        }
      };
      arr.push(`;begin rib`);
      for (let r = 0; r < 2; ++r) {
        dir1 === '-' ? (NEGRIB('b'), POSRIB('f')) : (POSRIB('b'), NEGRIB('f'));
      }
      arr.push(`x-speed-number 100`);
      for (let n = colors_arr[0].length; n >= 1; --n) {
        ////doesn't rly matter direction for xfer
        if (n % 2 === 0) arr.push(`xfer b${n} f${n}`);
      }
      for (let n = 1; n <= colors_arr[0].length; ++n) {
        if (n % 2 !== 0) arr.push(`xfer f${n} b${n}`);
      }
      arr.push(`x-speed-number ${speed_number}`, `x-stitch-number ${Math.ceil(Number(stitch_number) / 2)}`); ////calculate rib stitch number based on actual stitch number
      rib_loop: for (let r = 0; r < rib_rows / 2; ++r) {
        dir1 === '-' ? NEGRIB('b', 'alt') : POSRIB('b', 'alt');
        if (r === rib_rows / 2 - 2 && bot_dir_switch) {
          [dir1, dir2] = [dir2, dir1];
          break rib_loop;
        }
        dir2 === '-' ? NEGRIB('b', 'alt') : POSRIB('b', 'alt');
      }
      arr.push(`x-stitch-number ${stitch_number}`);
      for (let r = 0; r < 4; ++r) {
        dir1 === '-' ? (NEGRIB('b'), POSRIB('f')) : (POSRIB('b'), NEGRIB('f'));
      }
      if (!double_bed) {
        arr.push(`x-speed-number 100`);
        for (let n = colors_arr[0].length; n >= 1; --n) {
          arr.push(`xfer b${n} f${n}`);
        }
      }
      arr.push(`x-speed-number ${speed_number}`, `;end rib`);
    };
    /////
    if (rib_bottom !== null) {
      if (initial_carriers[initial_carriers.findIndex((el) => el.CARRIER == rib_bottom)].DIR === '+') bot_dir_switch = true;
      RIB(rib_arr, rib_bottom, '-', '+', ribB_rows);
      knitout.unshift(rib_arr);
    }
    if (machine.includes('kniterate')) {
      knitout.unshift(waste_yarn_section);
      knitout.unshift(kniterate_caston);
    }
    ////
    knitout.unshift(`;background color: ${background}`);
    /////
    for (let d = colors_data.length - 1; d >= 0; --d) {
      knitout.unshift(colors_data[d]);
    }
    ////
    if (back_style === 'Secure') knitout.unshift(`x-carrier-spacing 1.5`);
    if (speed_number !== '-1') knitout.unshift(`x-speed-number ${speed_number}`);
    if (stitch_number !== '-1') knitout.unshift(`x-stitch-number ${stitch_number}`);
    knitout.unshift(`;!knitout-2`, `;;Machine: ${machine}`, `;;Carriers:${carriers_str}`);
    last_needle = colors_arr[0].length;
    if (rib_top !== null) {
      bindoff_carrier = rib_top;
      bot_dir_switch = false;
      let rib1_dir;
      carrier_track[carrier_track.findIndex((el) => el.CARRIER == rib_top)].DIR === '+'
        ? ((rib1_dir = '-'), (last_pass_dir = '+'), (xfer_needle = last_needle))
        : ((rib1_dir = '+'), (last_pass_dir = '-'), (xfer_needle = 1));
      RIB(knitout, rib_top, rib1_dir, last_pass_dir, ribT_rows);
    } else {
      bindoff_carrier = knitout[knitout.length - 1].charAt(knitout[knitout.length - 1].length - 1);
      knitout[knitout.length - 1].includes('+') ? ((last_pass_dir = '+'), (xfer_needle = last_needle)) : ((last_pass_dir = '-'), (xfer_needle = 1));
    }
  })
  .then(() => {
    ////bindoff
    //TODO: add negative x-roller-advance or maybe binding off simultaneously from both sides to deal with too much roll tension on latter stitches when large # of needles in work (mostly last stitch breaking... so maybe use out-carrier to other side [by end stitch] to knit that one when ~8 needles to cast off left so stitch is loose & won't break)
    bindoff.push(`;bindoff section`, `x-speed-number 100`, `x-roller-advance 100`);
    let side;
    let count = last_needle;
    last_pass_dir === '+' ? (side = 'right') : (side = 'left');
    if (side === 'right') {
      xfer_needle = xfer_needle - count + 1;
    }
    const posLoop = (op, bed) => {
      pos: for (let x = xfer_needle; x < xfer_needle + count; ++x) {
        if (op === 'knit') {
          bindoff.push(`knit + ${bed}${x} ${bindoff_carrier}`);
        }
        if (op === 'xfer') {
          let receive;
          bed === 'f' ? (receive = 'b') : (receive = 'f');
          bindoff.push(`xfer ${bed}${x} ${receive}${x}`);
        }
        if (op === 'bind') {
          if (x === xfer_needle + count - 1) {
            break pos;
          }
          bindoff.push(`xfer b${x} f${x}`);
          bindoff.push(`rack -1`);
          ///
          bindoff.push(`xfer f${x} b${x + 1}`);
          bindoff.push(`rack 0`);
          if (x !== xfer_needle) {
            if (x > xfer_needle + 3) { //new //check
              bindoff.push(`x-add-roller-advance -50`); ////to have 0 roller-advance for tuck
            }
            bindoff.push(`drop b${x - 1}`);
          }
          bindoff.push(`knit + b${x + 1} ${bindoff_carrier}`);
          if (x < xfer_needle + count - 2) bindoff.push(`tuck - b${x} ${bindoff_carrier}`);
          // if (x === xfer_needle) bindoff.push(`drop b${xfer_needle - 1}`);
          if (x === xfer_needle + 3) bindoff.push(`drop b${xfer_needle - 1}`); //new ////don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security) //check 3
        }
      }
    };
    const negLoop = (op, bed) => {
      neg: for (let x = xfer_needle + count - 1; x >= xfer_needle; --x) {
        if (op === 'knit') {
          bindoff.push(`knit - ${bed}${x} ${bindoff_carrier}`);
        }
        if (op === 'xfer') {
          let receive;
          bed === 'f' ? (receive = 'b') : (receive = 'f');
          bindoff.push(`xfer ${bed}${x} ${receive}${x}`);
        }
        if (op === 'bind') {
          if (x === xfer_needle) {
            break neg;
          }
          bindoff.push(`xfer b${x} f${x}`);
          bindoff.push(`rack 1`);
          bindoff.push(`xfer f${x} b${x - 1}`);
          bindoff.push(`rack 0`);
          if (x !== xfer_needle + count - 1) {
            if (x < xfer_needle + count - 4) {
              //new //check
              bindoff.push(`x-add-roller-advance -50`);
            }
            bindoff.push(`drop b${x + 1}`);
          }
          bindoff.push(`knit - b${x - 1} ${bindoff_carrier}`);
          if (x > xfer_needle + 1) bindoff.push(`tuck + b${x} ${bindoff_carrier}`);
          // if (x === xfer_needle + count - 1) bindoff.push(`drop b${xfer_needle + count}`);
          if (x === xfer_needle + count - 4) bindoff.push(`drop b${xfer_needle + count}`); //new ////don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security) //check 4
        }
      }
    };
    // }; //if ended with pos loop dir = pos
    const bindoffTail = (last_needle, dir) => {
      bindoff.push(`;tail`);
      let otherT_dir, miss1, miss2;
      dir === '+' ? ((otherT_dir = '-'), (miss1 = last_needle + 1), (miss2 = last_needle - 1)) : ((otherT_dir = '+'), (miss1 = last_needle - 1), (miss2 = last_needle + 1));
      bindoff.push(`x-roller-advance 200`);
      bindoff.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
      for (let i = 0; i < 6; ++i) {
        bindoff.push(`knit ${otherT_dir} b${last_needle} ${bindoff_carrier}`);
        bindoff.push(`miss ${otherT_dir} b${miss2} ${bindoff_carrier}`);
        bindoff.push(`knit ${dir} b${last_needle} ${bindoff_carrier}`);
        bindoff.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
      }
      bindoff.push(`x-add-roller-advance 200`);
      bindoff.push(`drop b${last_needle}`);
    };
    ///////////////
    if (side === 'left') {
      if (!rib_top) posLoop('knit', 'f');
      if (double_bed) {
        if (!rib_top) negLoop('knit', 'b');
        negLoop('xfer', 'f');
      } else {
        if (!rib_top) negLoop('knit', 'f');
      }
      bindoff.push(`x-roller-advance 50`);
      bindoff.push(`x-add-roller-advance -50`);
      bindoff.push(`tuck - b${xfer_needle - 1} ${bindoff_carrier}`);
      bindoff.push(`knit + b${xfer_needle} ${bindoff_carrier}`);
      posLoop('bind', null);
      bindoffTail(xfer_needle + count - 1, '+');
      /////////////////////////////
    } else if (side === 'right') {
      negLoop('knit', 'f');
      if (double_bed) {
        posLoop('knit', 'b');
        posLoop('xfer', 'f');
      } else {
        posLoop('knit', 'f');
      }
      bindoff.push(`x-roller-advance 50`);
      bindoff.push(`x-add-roller-advance -50`);
      bindoff.push(`tuck + b${xfer_needle + count} ${bindoff_carrier}`);
      bindoff.push(`knit - b${xfer_needle + count - 1} ${bindoff_carrier}`);
      negLoop('bind', null);
      bindoffTail(xfer_needle, '-');
    }
    /////
    //TODO: add feature to pause & ask "all stitches dropped?" then miss pass with add-roller-advance 1000 or something (calculate how much is necessary based on how many rows)
    //TODO: add knitout extension to pause , along with message
    knitout.push(bindoff);
    knitout = knitout.flat();
    let yarn_out;
    machine.includes('kniterate') ? (yarn_out = 'out') : ((yarn_out = 'outhook'), color_carriers.push(jacquard_passes[0][0][1]));
    let end_splice = knitout.indexOf(`;tail`);
    for (let i = 0; i <= color_carriers.length; ++i) {
      let carrier_search = knitout.map((el) => el.includes(` ${color_carriers[i]}`) && (el.includes(`knit`) || el.includes(`miss`)));
      let last = carrier_search.lastIndexOf(true);
      if (last !== -1) {
        if (knitout[last].includes(' - ')) {
          knitout.splice(last + 1, 0, `${yarn_out} ${color_carriers[i]}`);
          if (last + 1 < end_splice) ++end_splice;
        } else {
          let out_spot = Number(knitout[last].split(' ')[2].slice(1)) + 6;
          knitout.splice(last + 1, 0, `miss + f${out_spot} ${color_carriers[i]}`);
          if (last + 1 < end_splice) ++end_splice;
          if (color_carriers[i] != bindoff_carrier) {
            knitout.splice(end_splice, 0, `${yarn_out} ${color_carriers[i]}`);
          } else {
            knitout.push(`${yarn_out} ${color_carriers[i]}`); ////at the end
          }
        }
      }
    }
    if (!color_carriers.includes(draw_thread)) knitout.splice(end_splice, 0, `${yarn_out} ${draw_thread}`);
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
      if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
      input = `${input}.k`;
      new_file = input;
      if (fs.existsSync(`./knit-out-files/${input}`) || fs.existsSync(`./knit-out-files/${input}.k`)) {
        overwrite = readlineSync.keyInYNStrict(chalk.black.bgYellow(`! WARNING:`) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`);
        return overwrite;
      }
      if (!fs.existsSync(`./knit-out-files/${input}`)) {
        return !fs.existsSync(`./knit-out-files/${input}.k`);
      }
    });
    console.log(chalk.green(`-- Saving new file as: ${new_file}`));
    readlineSync.setDefaultOptions({ prompt: '' });
    fs.writeFile(`./knit-out-files/${new_file}`, knitout_str, function (err) {
      if (err) return console.log(err);
      console.log(
        chalk`{green \nThe knitout file has successfully been written and can be found in the 'knit-out-files' folder.\nOpen 'knit_motif.png'} {green.italic (located in the 'out-colorwork-images' folder)} {green to see a visual depiction of the knitting instructions.} {green.italic (This folder also contains: 'colorwork.png', which depicts the resized image. Please note that, if applicable, the program has renamed files in that folder from earlier sessions, by appending a number to the end.)} {bold.bgGray.underline \n*** If you would like to add shaping to the file next, type 'npm run shapeify'}`
      );
    });
  });

//TODO: maybe add error check for this one too?

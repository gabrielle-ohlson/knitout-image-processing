//TODO: add option to count the # of needles in a row on front bed and if a lot, split it up in 2-3 passes
//TODO: (//? maybe if kniterate machine, make default cast-on waste yarn, and then otherwise, give option?)
//TODO: add option for fair isle too (not just jacquard... also maybe ladderback jacquard ? and real (0.5 rack) birdseye [maybe give warning that there might be too much build up on back if a lot of colors -- so recommend ladder back or default])

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

let carrier_track = [],
  initial_carriers = [];
const FINDMYCARRIER = ({ CARRIER, DIR }) => ({
  CARRIER,
  DIR,
});

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
// speed_number === '-1' ? console.log(chalk.green(`-- Speed number: UNSPECIFIED`)) : console.log(chalk.green(`-- Speed number: ${speed_number}`));

// let back_style = ['Default', 'Birdseye', 'Ladderback', 'New'],
let back_style = ['Default', 'Birdseye', 'Minimal'],
  style = readlineSync.keyInSelect(
    back_style,
    chalk`{blue.bold ^What style back would you like to use?} {blue.italic \n=> '}{blue.bold Birdseye}{blue.italic ' is not recommended for pieces that use more than 3 colors due to the build up of extra rows the method creates on the back bed.\n=> Alternatively, '}{blue.bold Minimal}{blue.italic ' creates a reasonably even ratio of front to back rows, resulting in the least amount of build up on the back.\n=> '}{blue.bold Default}{blue.italic ' is an in-between option that is similar to Birdseye, but more suitable for pieces containing up to 5 colors.}`
  );
console.log(chalk.green('-- Back style: ' + back_style[style]));
back_style = back_style[style];

let reverse;
back_style === 'Minimal' ? (reverse = false) : (reverse = true);
// let reverse = readlineSync.keyInYNStrict('Would you like to reverse?'); ////temporary

let rib = false, //new
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
          ));
        rib_bottom = rib_carrier + 1; //check
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
        rib_top = rib_carrier + 1; //check
        ribT_rows = readlineSync.questionInt(chalk`{blue.bold \nHow many rows? }`);
        // rib_top = [rib_carrier, rib_top[rib_carrier]];
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
      all_needles.push(x); //new
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
        rows.push(carrier_passes); //?
      } else {
        carrier_passes = carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length); ////?keep empty passes ?
        if (carrier_passes.length === 1) {
          carrier_passes.push([[]]);
        }
        rows.push(carrier_passes); //new
      }
      row = [];
      carrier_passes = [];
    }
    let passes_per_row = [];
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
      if (i === prev_row + passes_per_row[row_count - 1]) {
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
          back_needles.push(x); //check //remove //? or keep?
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
                  // let missing_needles = all_needles.filter((x) => back_needles.indexOf(x) === -1);
                  if (missing_needles.includes(x)) {
                    // if (missing_needles.includes(x) && i === prev_row + passes_per_row[row_count - 1] - 1) {
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
          } else if (back_style === 'Minimal') {
            if ((dir === '+' && x === 1) || (dir === '-' && x === colors_arr[0].length)) {
              leftovers2 = [...new Set([...leftovers2, ...leftovers])];
              leftovers = [];
            }
            if (x % passes_per_row[row_count - 1] === pass_count) {
              if (!taken) {
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                if (leftovers2.includes(x)) {
                  leftovers2.splice(leftovers2.indexOf(x), 1);
                }
              } else {
                leftovers.push(x);
              }
            } else if (leftovers2.includes(x)) {
              if (!taken) {
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                leftovers2.splice(leftovers2.indexOf(x), 1);
              }
            }
          } else {
            if (i % 2 === 0 && !taken) {
              if (x % 2 !== 0) {
                //come back!
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                back_needles.push(x);
              } else {
                let missing_needles = even_bird.filter((x) => back_needles.indexOf(x) === -1);
                if (missing_needles.includes(x) && i === prev_row + passes_per_row[row_count - 1] - 1) {
                  // if (missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
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
                  // if (missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
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
          if (draw_thread === undefined) {
            if (machine.includes('kniterate') && carrier !== neg_carrier && !knitout.some((el) => el.includes(`knit`) && el.includes(` ${carrier}`))) {
              ////last bit bc saying 'only if this carrier hasn't appeared yet, aka the FIRST pass is negative'
              if (rib_bottom != carrier) draw_thread = carrier; //new
            }
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
      // let kniterate_caston = [];
      ////
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
        colors_arr[0].length < 40 ? (caston_count = 3) : (caston_count = 2); //new //check
        kniterate_caston.push(yarn_in); //TODO: add extra pos pass for carriers that start in neg direction, so don't need to worry about back pass (make sure this doesn't impact waste yarn & draw thread carriers tho)
        for (let p = 0; p < caston_count; ++p) {
          kniterate_caston.push(pos_carrier_caston, neg_carrier_caston);
        } //new //check
        /////new
        if (
          i < color_count &&
          carrier !== jacquard_passes[0][0][1] &&
          carrier !== draw_thread &&
          carrier !== rib_bottom && //new
          initial_carriers[initial_carriers.findIndex((el) => el.CARRIER === carrier)].DIR === '-'
          // ((draw_thread !== undefined && carrier !== draw_thread) || (draw_thread === undefined && carrier !== draw_thread))
        ) {
          if (!pos_carrier_caston[pos_carrier_caston.length - 1].includes(colors_arr[0].length)) pos_carrier_caston.push(`miss + f${colors_arr[0].length} ${carrier}`);
          kniterate_caston.push(pos_carrier_caston);
        }
      }
      let backpass_draw = false; //new
      let backpass = [];
      if (draw_thread === undefined) {
        //come back!
        draw_thread = color_carriers[color_carriers.length - 1];
        if (color_carriers.length === color_count) backpass_draw = true; //new ////so only if draw_thread is used in piece
      }
      kniterate_caston.push(`;kniterate yarns in`);
      kniterate_caston = kniterate_caston.flat();
      // let waste_yarn_section = [];
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
        waste_yarn_section.push(`;dropped extra needles`); //new
      }
      /////
      waste_yarn_section.push(`x-roller-advance 100`); //new //?
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
              // if (i !== 12) {
              //   waste_yarn_section.push(`knit + f${x} ${carrier}`);
              // } else {
              //   waste_yarn_section.push(`drop b${x}`);
              //   if (colors_arr[0].length < 20 && x > colors_arr[0].length) { //new //?
              //     waste_yarn_section.push(`drop f${x}`); //new //?
              //   }
              // }
            }
          }
        } else {
          for (let x = colors_arr[0].length; x > 0; --x) {
            if (i < 11 || rib_bottom === null || carrier === rib_bottom) waste_yarn_section.push(`knit - b${x} ${carrier}`); //new //check
            if (backpass_draw && i === 12 && x % 2 !== 0) {
              //new
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
      if (backpass_draw) waste_yarn_section.push(backpass); //new
      waste_yarn_section = waste_yarn_section.flat();
      // if (backpass_draw) knitout.unshift(backpass);
      // knitout.unshift(waste_yarn_section);
      // knitout.unshift(kniterate_caston);
    }
    const RIB = (arr, carrier, dir1, dir2, rib_rows) => {
      arr.push(`;begin rib`);
      for (let r = 0; r < 2; ++r) {
        for (let n = colors_arr[0].length; n >= 1; --n) {
          arr.push(`knit ${dir1} b${n} ${carrier}`);
        }
        for (let n = 1; n <= colors_arr[0].length; ++n) {
          arr.push(`knit ${dir2} f${n} ${carrier}`);
        }
      }
      arr.push(`x-speed-number 100`);
      for (let n = colors_arr[0].length; n >= 1; --n) {
        if (n % 2 === 0) arr.push(`xfer b${n} f${n}`);
      }
      for (let n = 1; n <= colors_arr[0].length; ++n) {
        if (n % 2 !== 0) arr.push(`xfer f${n} b${n}`);
      }
      arr.push(`x-speed-number ${speed_number}`, `x-stitch-number ${Math.ceil(Number(stitch_number) / 2)}`); //TODO: calculate rib stitch number based on actual stitch number - i'm think Math.ceil(stitch_number/2)
      rib_loop: for (let r = 0; r < rib_rows / 2; ++r) {
        for (let n = colors_arr[0].length; n >= 1; --n) {
          if (n % 2 !== 0) {
            arr.push(`knit ${dir1} b${n} ${carrier}`);
          } else {
            arr.push(`knit ${dir1} f${n} ${carrier}`);
          }
        }
        if (r === rib_rows / 2 - 2 && bot_dir_switch) {
          [dir1, dir2] = [dir2, dir1];
          break rib_loop;
        }
        for (let n = 1; n <= colors_arr[0].length; ++n) {
          if (n % 2 !== 0) {
            arr.push(`knit ${dir2} b${n} ${carrier}`);
          } else {
            arr.push(`knit ${dir2} f${n} ${carrier}`);
          }
        }
      }
      arr.push(`x-stitch-number ${stitch_number}`);
      for (let r = 0; r < 4; ++r) {
        for (let n = colors_arr[0].length; n >= 1; --n) {
          arr.push(`knit ${dir1} b${n} ${carrier}`);
        }
        for (let n = 1; n <= colors_arr[0].length; ++n) {
          arr.push(`knit ${dir2} f${n} ${carrier}`);
        }
      }
      if (!double_bed) {
        arr.push(`x-speed-number 100`);
        for (let n = colors_arr[0].length; n >= 1; --n) {
          arr.push(`xfer b${n} f${n}`);
          // arr.push(`xfer f${n} b${n}`);
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
    if (speed_number !== '-1') knitout.unshift(`x-speed-number ${speed_number}`);
    if (stitch_number !== '-1') knitout.unshift(`x-stitch-number ${stitch_number}`);
    knitout.unshift(`;!knitout-2`, `;;Machine: ${machine}`, `;;Carriers:${carriers_str}`);
    // bindoff_carrier = knitout[knitout.length - 1].charAt(knitout[knitout.length - 1].length - 1);
    // last_needle = colors_arr[0].length;
    // knitout[knitout.length - 1].includes('+') ? ((last_pass_dir = '+'), (xfer_needle = last_needle)) : ((last_pass_dir = '-'), (xfer_needle = 1));
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
    bindoff.push(`;bindoff section`, `x-speed-number 100`, `x-roller-advance 100`); //speed-number & roller-advance is //new
    let side;
    let count = last_needle;
    // knitout.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false);
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
            bindoff.push(`x-add-roller-advance -50`);
            bindoff.push(`drop b${x - 1}`);
          }
          bindoff.push(`knit + b${x + 1} ${bindoff_carrier}`);
          if (x < xfer_needle + count - 2) bindoff.push(`tuck - b${x} ${bindoff_carrier}`);
          if (x === xfer_needle) bindoff.push(`drop b${xfer_needle - 1}`);
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
            bindoff.push(`x-add-roller-advance -50`);
            bindoff.push(`drop b${x + 1}`);
          }
          bindoff.push(`knit - b${x - 1} ${bindoff_carrier}`);
          if (x > xfer_needle + 1) bindoff.push(`tuck + b${x} ${bindoff_carrier}`);
          if (x === xfer_needle + count - 1) bindoff.push(`drop b${xfer_needle + count}`);
        }
      }
    };
    // }; //if ended with pos loop dir = pos
    const bindoffTail = (last_needle, dir) => {
      bindoff.push(`;tail`); //new
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
      // posLoop('knit', 'f');
      if (double_bed) {
        if (!rib_top) negLoop('knit', 'b'); //new
        negLoop('xfer', 'f'); //new
      } else {
        if (!rib_top) negLoop('knit', 'f'); //new
      }
      // negLoop('xfer', 'f'); //new
      bindoff.push(`x-roller-advance 50`); //new
      bindoff.push(`x-add-roller-advance -50`);
      bindoff.push(`tuck - b${xfer_needle - 1} ${bindoff_carrier}`);
      bindoff.push(`knit + b${xfer_needle} ${bindoff_carrier}`); //new
      posLoop('bind', null);
      bindoffTail(xfer_needle + count - 1, '+');
      /////////////////////////////
    } else if (side === 'right') {
      negLoop('knit', 'f');
      // if (double_bed) posLoop('knit', 'b'); //new
      if (double_bed) {
        posLoop('knit', 'b');
        posLoop('xfer', 'f');
      } else {
        posLoop('knit', 'f'); //new
      }
      // posLoop('xfer', 'f'); //new
      bindoff.push(`x-roller-advance 50`); //new
      bindoff.push(`x-add-roller-advance -50`); //new
      bindoff.push(`tuck + b${xfer_needle + count} ${bindoff_carrier}`);
      bindoff.push(`knit - b${xfer_needle + count - 1} ${bindoff_carrier}`);
      negLoop('bind', null);
      bindoffTail(xfer_needle, '-');
    }
    /////
    //TODO: add feature to pause & ask "all stitches dropped?" then miss pass with add-roller-advance 1000 or something (calculate how much is necessary based on how many rows)
    //TODO: add knitout extension to pause , along with message for
    knitout.push(bindoff);
    knitout = knitout.flat();
    let yarn_out;
    machine.includes('kniterate') ? (yarn_out = 'out') : ((yarn_out = 'outhook'), color_carriers.push(jacquard_passes[0][0][1]));
    let end_splice = knitout.indexOf(`;tail`); //new //TODO: actually, take them out before knitting tail so less juggling
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
            //new
            knitout.splice(end_splice, 0, `${yarn_out} ${color_carriers[i]}`);
          } else {
            knitout.push(`${yarn_out} ${color_carriers[i]}`); ////at the end
          }
        }
      }
    }
    if (!color_carriers.includes(draw_thread)) knitout.splice(end_splice, 0, `${yarn_out} ${draw_thread}`); //new //TODO: maybe add something to check whether it is the bindoff carrier? and what the direction is?
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

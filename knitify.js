//TODO: add option to count the # of needles in a row on front bed and if a lot, split it up in 2-3 passes
//TODO: (//? maybe if kniterate machine, make default cast-on waste yarn, and then otherwise, give option?)
//TODO: add option for fair isle too (not just jacquard... also maybe ladderback jacquard ? and real (0.5 rack) birdseye [maybe give warning that there might be too much build up on back if a lot of colors -- so recommend ladder back or default])

const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const imageColors = require('./image-color-quantize.js');
let background, machine, palette, color_count, init_dir, other_dir, draw_thread;
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

let carrier_track = [];
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
speed_number === '-1' ? console.log(chalk.green(`-- Speed number: UNSPECIFIED`)) : console.log(chalk.green(`-- Speed number: ${speed_number}`));

let back_style = ['Default', 'Birdseye', 'Ladderback', 'New'],
  style = readlineSync.keyInSelect(back_style, chalk.blue.bold(`^What style back would you like to use?`));
console.log(chalk.green('-- Back style: ' + back_style[style]));
back_style = back_style[style];
//TODO: add option for REAL birdseye (aka half rack etc) as well as ladderback birdseye
//TODO: clean this up

let reverse = readlineSync.keyInYNStrict('Would you like to reverse?'); //temporary //TODO: remove this or clean it up
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
        // rows.push(carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length)); ////?keep empty passes ?
      }
      row = [];
      carrier_passes = [];
    }
    let passes_per_row = [];
    for (let i = 0; i < rows.length; ++i) {
      if (i % 2 !== 0 && reverse) {
        //new //remove //?
        // if (i % 2 !== 0) { //go back! //?
        rows[i].reverse();
      }
      passes_per_row.push(rows[i].length);
    }
    jacquard_passes = rows.flat();
    let row_count = 1;
    let pass_count = 0; //new
    let leftovers = [],
      leftovers2 = []; //new
    // let back = []; //new //remove
    knitout.push(`;row: ${row_count}`);
    ////new
    if (passes_per_row[row_count - 1] >= 5) {
      //// -1 since starting from 1 not 0 for row count
      knitout.push(`x-roller-advance 80`); //new
      // passes_per_row[row_count - 1] === 5 ? knitout.push(`x-roller-advance 80`) : knitout.push(`x-roller-advance 50`); //new
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
    // let single_color;
    for (let i = 0; i < jacquard_passes.length; ++i) {
      let single_color = false;
      if (i === prev_row + passes_per_row[row_count - 1]) {
        // if (colors_arr[0].length - back.length > 4 && back.length !== 0) {
        //   //remove
        //   console.log(`!!!!!!!!!!!`);
        //   console.log(
        //     row_count,
        //     back.length,
        //     all_needles.filter((x) => back.indexOf(x) === -1)
        //   );
        // }
        // back = []; //remove
        pass_count = 0;
        row_count += 1;
        knitout.push(`;row: ${row_count}`);
        ////new //TODO: edit this
        if (passes_per_row[row_count - 1] >= 5) {
          // if (passes_per_row[row_count - 1] >= 5 && passes_per_row[row_count - 2] < 5) {
          //// -1 since starting from 1 not 0 for row count
          knitout.push(`x-roller-advance 0`); //new
          // knitout.push(`x-roller-advance 80`); //new
          // passes_per_row[row_count - 1] === 5 ? knitout.push(`x-roller-advance 80`) : knitout.push(`x-roller-advance 50`); //new
        } else if (passes_per_row[row_count - 1] < 5 && passes_per_row[row_count - 2] >= 5) {
          knitout.push(`x-roller-advance 100`); //new
        }
        // if (passes_per_row[row_count - 1] >= 5 && passes_per_row[row_count - 1] !== passes_per_row[row_count - 2]) {
        // passes_per_row[row_count - 1] === 5 ? knitout.push(`x-roller-advance 80`) : knitout.push(`x-roller-advance 50`); //new
        // }
        //
        prev_row = i;
        back_needles = [];
        // }
      }
      if ((passes_per_row[row_count - 1] === 6 && pass_count === 5) || (passes_per_row[row_count - 1] === 5 && pass_count === 4)) {
        //new
        // if (passes_per_row[row_count - 1] === 6 && pass_count === 5) { //new
        knitout.push(`x-roller-advance 450`); //new
      }
      i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);
      if (jacquard_passes[i][0].length > 0) {
        // single_color = false;
        // console.log(`jacquard_passes[i][0] = ${jacquard_passes[i][0]}`); //remove
        carrier = jacquard_passes[i][0][1];
      } else {
        single_color = true;
        carrier = jacquard_passes[i - 1][0][1]; //new
        if (carrier === undefined) carrier = jacquard_passes[i - 2][0][1]; //TODO: make this work for birds eye too
        // if (carrier === undefined) carrier = carrier_track[carrier_track.length - 1].CARRIER;
      }
      // carrier = jacquard_passes[i][0][1];
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
        if (single_color) {
          knitout.push(`knit ${dir} b${x} ${carrier}`);
          back_needles.push(x); //check //remove //? or keep?
        } else {
          if (back_style === 'Ladderback') {
            //new
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
          } else if (back_style === 'New') {
            //new (obviously lmao)
            // if (x === 1) leftovers = []; //new
            if ((dir === '+' && x === 1) || (dir === '-' && x === colors_arr[0].length)) {
              // if (x === colors_arr[0].length) {
              // console.log(leftovers);
              // if (row_count === 3 || row_count === 4) console.log(colors_arr[0].length, leftovers2.length, row_count, pass_count, leftovers2);
              leftovers2 = [...new Set([...leftovers2, ...leftovers])];
              // leftovers2 = [...leftovers];
              leftovers = []; //new
            }
            if (x % passes_per_row[row_count - 1] === pass_count) {
              if (!taken) {
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                // back.push(x); //new //remove
                if (leftovers2.includes(x)) {
                  leftovers2.splice(leftovers2.indexOf(x), 1); //new
                  // if (row_count === 3 || row_count === 4) console.log(xtra); //remove
                }
                // if (leftovers2.includes(x)) leftovers2.splice(leftovers2.indexOf(x), 1); //new
              } else {
                leftovers.push(x);
                // leftovers.push(x);
              }
            } else if (leftovers2.includes(x)) {
              if (!taken) {
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                // back.push(x); //new //remove
                leftovers2.splice(leftovers2.indexOf(x), 1); //go back! //?
                // } else {
                //   knitout.push(`;${x} is taken`); //remove
              }
            }
            // } else if (leftovers2.includes(x) && !taken) {
            //   knitout.push(`knit ${dir} b${x} ${carrier}`);
            //   leftovers2.splice(leftovers2.indexOf(x), 1); //go back! //?
            // }
            // for (let m = 0; m < passes_per_row[row_count - 1]; ++m) {
            //   if (pass_count % passes_per_row[row_count - 1] === m) {

            //   }
            // }
            // if (pass_count % passes_per_row[row_count - 1] === )
            // if (passes_per_row[row_count - 1]
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
              } //?
            }
            if (i % 2 !== 0 && !taken) {
              if (x % 2 === 0) {
                knitout.push(`knit ${dir} b${x} ${carrier}`);
                back_needles.push(x);
              } else {
                let missing_needles = odd_bird.filter((x) => back_needles.indexOf(x) === -1);
                if (missing_needles.includes(x) && i === prev_row + passes_per_row[row_count - 1] - 1) {
                  //new
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
          if (machine.includes('kniterate') && carrier !== neg_carrier && draw_thread === undefined && !knitout.some((el) => el.includes(`knit`) && el.includes(` ${carrier}`))) {
            draw_thread = carrier;
          }
        }
      }
      ++pass_count; //new
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
      ////
      for (let n = 1; n <= colors_arr[0].length; ++n) {}

      ///
      caston = [...pos_caston, ...neg_caston]; //? //moved //so, if not less than 20, this section is length of real section
      let waste_stitches = 20;
      // let waste_stitches;
      // if (colors_arr[0].length >= 20) {
      //   waste_stitches = 20;
      // } else {
      //   waste_stitches = colors_arr[0].length; //new //?
      //   // waste_stitches = Math.ceil(0.6 * colors_arr[0].length);
      //   // if (waste_stitches < 5) waste_stitches = colors_arr[0].length;
      // }
      for (let w = colors_arr[0].length; w > waste_stitches; --w) {
        pos_caston = pos_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
        neg_caston = neg_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
      }
      ////
      if (colors_arr[0].length < 20) {
        //new //?
        for (let x = colors_arr[0].length + 1; x <= 20; ++x) {
          x % 2 === 0 ? pos_caston.push(`knit + b${x} ${jacquard_passes[0][0][1]}`) : pos_caston.push(`knit + f${x} ${jacquard_passes[0][0][1]}`);
          x % 2 !== 0 ? neg_caston.unshift(`knit - b${x} ${jacquard_passes[0][0][1]}`) : neg_caston.unshift(`knit - f${x} ${jacquard_passes[0][0][1]}`);
        }
        caston = [...pos_caston, ...neg_caston]; //new //moved
        // for (let x = 20; x > colors_arr[0].length; --x) {
        //   x % 2 !== 0 ? neg_caston.unshift(`knit - b${x} ${jacquard_passes[0][0][1]}`) : neg_caston.unshift(`knit - f${x} ${jacquard_passes[0][0][1]}`);
        // }
      }
      /////
      // let kniterate_caston_base = [...pos_caston, ...neg_caston];
      //////
      let kniterate_caston = [];
      colors: for (let i = 0; i <= color_count; ++i) {
        //// <= because add extra one for draw thread
        if (draw_thread !== undefined && i === color_count) {
          //new (seems good!)
          break colors;
        }
        if (i === 6) {
          break colors;
        }
        carrier = carriers_arr[i];
        color_carriers.push(carrier);
        let yarn_in = `in ${carrier}`;
        let pos_carrier_caston = [];
        let neg_carrier_caston = [];
        let b = 'f';
        for (let n = Number(carrier); n <= colors_arr[0].length; n += carriers_arr.length) {
          //TODO: check whether carriers_arr is the one we want (maybe wait for color_carriers?)
          pos_carrier_caston.push(`knit + ${b}${n} ${carrier}`);
          b === 'f' ? (b = 'b') : (b = 'f');
          neg_carrier_caston.unshift(`knit - ${b}${n} ${carrier}`);
        }
        if (Number(carrier) !== 1) neg_carrier_caston.push(`miss - f1 ${carrier}`);
        // let carrier_caston = kniterate_caston_base.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
        let caston_count;
        colors_arr[0].length < 40 ? (caston_count = 3) : (caston_count = 2); //new //check
        kniterate_caston.push(yarn_in); //TODO: add extra pos pass for carriers that start in neg direction, so don't need to worry about back pass (make sure this doesn't impact waste yarn & draw thread carriers tho)
        for (let p = 0; p < caston_count; ++p) {
          kniterate_caston.push(pos_carrier_caston, neg_carrier_caston);
        } //new //check
        // kniterate_caston.push(yarn_in, pos_carrier_caston, neg_carrier_caston, pos_carrier_caston, neg_carrier_caston, pos_carrier_caston, neg_carrier_caston); //go back! //?
      }
      if (draw_thread === undefined) draw_thread = color_carriers[color_carriers.length - 1];
      kniterate_caston.push(`;kniterate yarns in`);
      kniterate_caston = kniterate_caston.flat();
      let waste_yarn_section = [];
      carrier = jacquard_passes[0][0][1];
      let waste_yarn = caston.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
      waste_yarn_section.push(`x-roller-advance 150`); //new //?
      for (let i = 0; i < 35; ++i) {
        ////70 total passes
        waste_yarn_section.push(waste_yarn);
      }
      ////
      if (colors_arr[0].length < 20) {
        waste_yarn_section.push(`x-roller-advance 50`);
        //new //?
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
            waste_yarn_section.push(`knit - b${x} ${carrier}`);
          }
        }
      }
      ////
      // waste_yarn_section.push(`x-roller-advance 100`); //new //?
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
    /////
    for (let d = colors_data.length - 1; d >= 0; --d) {
      knitout.unshift(colors_data[d]);
    }
    ////
    if (speed_number !== '-1') knitout.unshift(`x-speed-number ${speed_number}`);
    if (stitch_number !== '-1') knitout.unshift(`x-stitch-number ${stitch_number}`);
    knitout.unshift(`;!knitout-2`, `;;Machine: ${machine}`, `;;Carriers:${carriers_str}`);
    bindoff_carrier = knitout[knitout.length - 1].charAt(knitout[knitout.length - 1].length - 1);
    last_needle = colors_arr[0].length;
    knitout[knitout.length - 1].includes('+') ? ((last_pass_dir = '+'), (xfer_needle = last_needle)) : ((last_pass_dir = '-'), (xfer_needle = 1));
  })
  .then(() => {
    ////bindoff
    bindoff.push(`;bindoff section`, `x-speed-number 100`, `x-roller-advance 100`); //speed-number & roller-advance is //new
    // bindoff.push(`;bindoff section`, `x-speed-number ${speed_number}`); //speed_number is new
    // bindoff.push(`x-stitch-number 4`); //TODO: make these based on stitch number //go back! //?
    let side, double_bed;
    let count = last_needle;
    knitout.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false);
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
          // bindoff.push(`x-add-roller-advance 200`);
          bindoff.push(`xfer b${x} f${x}`);
          bindoff.push(`rack -1`);
          ///
          // bindoff.push(`x-add-roller-advance 100`);
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
            bindoff.push(`x-add-roller-advance -50`); //new
            bindoff.push(`drop b${x + 1}`); //newest
          }
          bindoff.push(`knit - b${x - 1} ${bindoff_carrier}`);
          if (x > xfer_needle + 1) bindoff.push(`tuck + b${x} ${bindoff_carrier}`); //new
          if (x === xfer_needle + count - 1) bindoff.push(`drop b${xfer_needle + count}`); //new need to //check
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
        // if (i === 0) bindoff.push(`x-stitch-number 4`); //go back! //?
      }
      bindoff.push(`x-add-roller-advance 200`);
      bindoff.push(`drop b${last_needle}`);
    };
    ///////////////
    if (side === 'left') {
      posLoop('knit', 'f');
      if (double_bed) negLoop('knit', 'b'); //new
      negLoop('xfer', 'f'); //new
      bindoff.push(`x-roller-advance 50`); //new
      bindoff.push(`x-add-roller-advance -50`); //remove //?
      bindoff.push(`tuck - b${xfer_needle - 1} ${bindoff_carrier}`); //new //check //TODO: maybe make this tuck if miss doesn't work well
      bindoff.push(`knit + b${xfer_needle} ${bindoff_carrier}`); //new
      posLoop('bind', null);
      bindoffTail(xfer_needle + count - 1, '+');
      /////////////////////////////
    } else if (side === 'right') {
      negLoop('knit', 'f');
      if (double_bed) posLoop('knit', 'b'); //new
      posLoop('xfer', 'f'); //new
      bindoff.push(`x-roller-advance 50`); //new
      bindoff.push(`x-add-roller-advance -50`); //new
      bindoff.push(`tuck + b${xfer_needle + count} ${bindoff_carrier}`); //new //check //TODO: maybe make this tuck if miss doesn't work well
      bindoff.push(`knit - b${xfer_needle + count - 1} ${bindoff_carrier}`); //new
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
          if (last + 1 < end_splice) ++end_splice; //new
        } else {
          let out_spot = Number(knitout[last].split(' ')[2].slice(1)) + 6;
          knitout.splice(last + 1, 0, `miss + f${out_spot} ${color_carriers[i]}`); //new
          if (last + 1 < end_splice) ++end_splice; //new
          if (color_carriers[i] != bindoff_carrier) {
            //new
            knitout.splice(end_splice, 0, `${yarn_out} ${color_carriers[i]}`); //new
          } else {
            knitout.push(`${yarn_out} ${color_carriers[i]}`); ////at the end
          }
        }
      }
    }
    if (!color_carriers.includes(draw_thread)) knitout.splice(end_splice, 0, `${yarn_out} ${draw_thread}`); //new //TODO: maybe add something to check whether it is the bindoff carrier? add what the direction is?
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
        chalk`{green \nThe knitout file has successfully been written and can be found in the 'knit-out-files' folder.\nOpen 'knit_motif.png'} {green.italic (located in the 'out-colorwork-images' folder)} {green to see a visual depiction of the knitting instructions.} {green.italic This folder also contains: 'colorwork.png', which depicts the resized image. Please note that, if applicable, the program has renamed files in that folder from earlier sessions, by appending a number to the end.)} {bold.bgGray.underline \n*** If you would like to add shaping to the file next, type 'npm run shapeify'}`
      );
    });
  });

//TODO: maybe add error check for this one too?

//TODO: (//? maybe if kniterate machine, make default cast-on waste yarn, and then otherwise, give option?)
//TODO: add option for fair isle and intarsia too (not just jacquard... also maybe ladderback jacquard ?)

const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const imageColors = require('./image-color-quantize.js');
let background, machine, palette, color_count, init_dir, other_dir;
let colors_arr = [];
let knitout = [];
let row = [];
let carrier_passes = [];
let carriers_arr = [];
let color_carriers = [];
let rows = [];
let jacquard_passes = [];
let caston = [];
let pos_caston = [];
let neg_caston = [];
let bindoff = [];
let last_pass_dir, xfer_needle, last_needle, bindoff_carrier;

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
    colors_arr = result;
    return result;
  })
  .then(() => {
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
    let even_bird = [];
    let odd_bird = [];
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
        // if (carrier_pass.length === 0) carrier_pass = [['carrier', i]]; //new
        carrier_passes.push(carrier_pass);
        carrier_pass = [];
      }
      console.log(carrier_passes); //remove
      // rows.push(carrier_passes); //new
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
    // let side;
    // let neg_carrier2;
    let back_needles = []; //new //?
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
      // if (jacquard_passes[i][0][0] === 'carrier') console.log(`carrier`);
      ///////
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
            // if (x % 2 !== 0 && jacquard_passes[i][0][0] !== 'carrier') {
            knitout.push(`knit ${dir} b${x} ${carrier}`);
            back_needles.push(x); //new
          } else {
            //new //?
            let missing_needles = even_bird.filter((x) => back_needles.indexOf(x) === -1);
            // if (jacquard_passes[i][0][0] === 'carrier' && missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
            if (missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
              knitout.push(`knit ${dir} b${x} ${carrier}`);
            }
          } //?
        }
        // if (i % 2 !== 0 && !taken && x % 2 === 0) {
        if (i % 2 !== 0 && !taken) {
          if (x % 2 === 0) {
            // if (x % 2 === 0 && jacquard_passes[i][0][0] !== 'carrier') {
            knitout.push(`knit ${dir} b${x} ${carrier}`);
            back_needles.push(x); //new
          } else {
            //new //?
            let missing_needles = odd_bird.filter((x) => back_needles.indexOf(x) === -1);
            // if (jacquard_passes[i][0][0] === 'carrier' && missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
            if (missing_needles.length > 0 && i === prev_row + passes_per_row[row_count - 1] - 1) {
              knitout.push(`knit ${dir} b${x} ${carrier}`);
            }
          } //?
        }
        // if (i % 2 === 0 && !taken && x % 2 !== 0) {
        //   knitout.push(`knit ${dir} b${x} ${carrier}`);
        // }
        // if (i % 2 !== 0 && !taken && x % 2 === 0) {
        //   knitout.push(`knit ${dir} b${x} ${carrier}`);
        // }
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
            // x % 2 !== 0 ? caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
          }
        }
      } else {
        for (let x = colors_arr[0].length; x > 0; --x) {
          knitoutLines(x, 1);
          if (i === 0 || i === 1) {
            if (machine.includes('kniterate')) neg_carrier = carrier;
            x % 2 === 0 ? neg_caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : neg_caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
            // x % 2 === 0 ? caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
          }
          if (
            machine.includes('kniterate') &&
            carrier !== neg_carrier &&
            draw_thread === undefined &&
            !knitout.some((el) => el.includes(`knit`) && el.includes(` ${carrier}`))
          ) {
            //new
            draw_thread = carrier; //new
          }
        }
      }
    }
    ////////
    // // function getAllIndexes(arr, val) {
    // let rowcount_idxs = [];
    // for (let i = 0; i < knitout.length; i++) {
    //   if (knitout[i].includes(`;row:`)) rowcount_idxs.push(i);
    //   // return rowcount_idxs;
    // }
    // // console.log(rowcount_idxs);
    // let in_needles = [];
    // for (let n = 1; n <= colors_arr[0].length; ++n) {
    //   in_needles.push(`${n}`);
    // }
    // // console.log(in_needles);
    // console.log(typeof in_needles[0]);
    // // let idx = 0;
    // for (let i = 0; i < rowcount_idxs.length; ++i) {
    //   let p;
    //   let back_needles = [];
    //   // i === 0 ? (p = 0) : (p = rowcount_idxs[i - 1]);
    //   p = rowcount_idxs[i];
    //   for (let b = rowcount_idxs[i] + 1; b < rowcount_idxs[i + 1]; ++b) {
    //     // console.log(knitout[b]); //remove
    //     let op_arr = knitout[b].split(' ');
    //     if (op_arr[2].charAt(0) === 'b') {
    //       back_needles.push(op_arr[2].slice(1));
    //     }
    //   }
    //   // console.log(back_needles);
    //   // console.log(typeof back_needles[0]);
    //   let missing_needles = in_needles.filter((x) => back_needles.indexOf(x) === -1);
    //   // console.log(missing_needles); //remove
    //   if (missing_needles.length > 0 && missing_needles.length !== in_needles.length) {
    //     // let forbidden_spots = [];
    //     // i === 0 ? (p = 0) : (p = rowcount_idxs[i - 1]);
    //     let op_arr = knitout[p].split(' ');
    //     let dir = op_arr[1];
    //     let passes = [];
    //     let pass = [];
    //     for (let b = p; b < rowcount_idxs[i]; ++b) {
    //       let op_arr = knitout[b].split(' ');
    //       if (op_arr[0] === 'knit') {
    //         if (op_arr[1] === dir) {
    //           pass.push(op_arr);
    //         } else {
    //           passes.push(pass);
    //           pass = [];
    //         }
    //       } else {
    //         pass.push(op_arr);
    //       }
    //       // all_ops.push
    //       // let op_arr = knitout[p].split(' ');
    //       // for (let m = 0; m < missing_needles.length; ++m) {
    //       //   if (op_arr[2] === `f${m}`) {
    //       //     forbidden_spots.push([p, m]);
    //       //   }
    //       // }
    //     }
    //     let mneedles = missing_needles.map((el) => el === Number(el)); //?
    //     let add_on = 0;
    //     for (let z = 0; z < passes.length; ++z) {
    //       if (z > 0) {
    //         add_on += passes[z - 1].length;
    //       }
    //       for (let m = 0; m < missing_needles.length; ++m) {
    //         let clash = passes[z].find((a) => a[2] === `f${missing_needles[m]}`);
    //         // if (clash === undefined && !insert.some(arr => arr[1] === m)) {
    //         if (clash === undefined && mneedles.includes(missing_needles[m])) {
    //           console.log(`class is undefined`); //remove
    //           let adjust, dir;
    //           passes[z][0][1] === '+' ? ((adjust = -1), (dir = '+')) : ((adjust = 1), (dir = '-'));
    //           let carrier = passes[z][0][3];
    //           let working_needles = [];
    //           for (let c = 0; c < passes[z].length; ++c) {
    //             working_needles.push(Number(passes[z][c][1].slice(1)));
    //           }
    //           const INSERT = passes[z].reduce((prev, curr) => (Math.abs(curr - missing_needles[m]) < Math.abs(prev - missing_needles[m]) ? curr : prev));
    //           let insert_spot = passes[z].indexOf((el) => el[2] === `b${INSERT + adjust}`);
    //           if (insert_spot === undefined) insert_spot = passes[z].indexOf((el) => el[2] === `f${INSERT + adjust}`);
    //           console.log(`insert spot = ${insert_spot}`); //remove
    //           console.log(`splice spot = ${p + insert_spot + add_on}`); //remove
    //           console.log(`knit ${dir} b${missing_needles[m]} ${carrier}`); //remove
    //           knitout.splice(p + insert_spot + add_on, 0, `knit ${dir} b${missing_needles[m]} ${carrier}`);
    //           // if (insert_spot === undefined) {
    //           //   for (let d = adjust; )
    //           // }
    //           // insert.push(z, m);
    //           mneedles = mneedles.filter((el) => el !== missing_needles[m]);
    //         }
    //         // if (op_arr[2] === `f${m}`) {
    //         //   forbidden_spots.push([p, m]);
    //         // }
    //       }
    //     }
    //     // knitout.findIndex(el => {
    //     //   knitout.indexOf(el)
    //     // })
    //     // back_needles.push('')
    //   }
    //   // ++idx;
    //   //   // knitout.findIndex()
    // }
    ////////
    let carriers_str = '';
    let max_carriers;
    machine.includes('kniterate') ? (max_carriers = 6) : (max_carriers = 10); //TODO: add more options for this, or maybe take it from command-line input (i.e. stoll machines have anywhere from 8 - 16 carriers [maybe even > || < for some])
    for (let i = 1; i <= max_carriers; ++i) {
      carriers_str = `${carriers_str} ${i}`;
      carriers_arr.push(i);
    }
    if (machine.includes('shima')) {
      caston = [...neg_caston, ...pos_caston]; //new
      caston.unshift(`inhook ${jacquard_passes[0][0][1]}`);
      caston.push(`releasehook ${jacquard_passes[0][0][1]}`);
      knitout.unshift(caston);
    } else if (machine.includes('kniterate')) {
      caston = [...pos_caston, ...neg_caston]; //new
      // let pass2 = caston[caston.length - 1];
      // console.log(caston); //remove
      // let kniterate_caston_base = `${caston.slice(0, caston.indexOf(`knit + f21 ${jacquard_passes[0][0][1]}`))},${caston.slice(
      //   caston.indexOf(`knit - f20 ${pass2.charAt(pass2.length - 1)}`),
      //   caston.length
      // )}`; //TODO: add alternative for if less than 21 needles are in work
      let waste_stitches; //new
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
      // let kniterate_caston_base = `${caston.slice(
      //   caston.indexOf(`knit + f1 ${jacquard_passes[0][0][1]}`),
      //   caston.indexOf(`knit + f21 ${jacquard_passes[0][0][1]}`)
      // )},${caston.slice(caston.indexOf(`knit - f20 ${pass2.charAt(pass2.length - 1)}`), caston.indexOf(`knit + f1 ${pass2.charAt(pass2.length - 1)}`))}`; //TODO: add alternative for if less than 21 needles are in work
      ////////
      console.log(kniterate_caston_base); //remove
      // kniterate_caston_base = kniterate_caston_base.split(',');
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
      if (draw_thread === undefined) draw_thread = color_carriers[color_carriers.length - 1]; //new
      kniterate_caston.push(`;kniterate yarns in`);
      kniterate_caston = kniterate_caston.flat();
      let waste_yarn_section = [];
      carrier = jacquard_passes[0][0][1];
      // carrier = neg_carrier;
      let waste_yarn = caston.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
      for (let i = 0; i < 35; ++i) {
        ////70 total passes
        waste_yarn_section.push(waste_yarn);
      }
      for (let i = 0; i < 14; ++i) {
        i % 2 !== 0 && i < 13 ? (dir = '-') : (dir = '+');
        if (i === 13) {
          // waste_yarn_section.push(`;draw thread: ${color_carriers[color_carriers.length - 1]}`);
          waste_yarn_section.push(`;draw thread: ${draw_thread}`);
        }
        if (dir === '+') {
          for (let x = 1; x <= colors_arr[0].length; ++x) {
            if (i === 13) {
              // waste_yarn_section.push(`knit + f${x} ${color_carriers[color_carriers.length - 1]}`); ////draw thread
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
      // waste_yarn_section.push(`rack 0.5`); ////aka rack 0.5 for kniterate (TODO: determine if this is something we're changing for kniterate backend)
      waste_yarn_section.push(`rack 0.25`); ////aka rack 0.5 for kniterate (TODO: determine if this is something we're changing for kniterate backend)
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
          bindoff.push(`knit - b${x - 1} ${bindoff_carrier}`); //fixed
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
  })
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
    console.log(chalk.green(`-- Saving new file as: ${new_file}`));
    readlineSync.setDefaultOptions({ prompt: '' });
    if (new_file.includes('.')) new_file = new_file.slice(0, new_file.indexOf('.'));
    fs.writeFile(`./knit-out-files/${new_file}.k`, knitout_str, function (err) {
      if (err) return console.log(err);
      console.log(
        chalk`{green \nThe knitout file has successfully been written and can be found in the 'knit-out-files' folder.\nOpen 'knit_motif.png'} {green.italic (located in the 'out-colorwork-images' folder)} {green to see a visual depiction of the knitting instructions.} {green.italic This folder also contains: 'colorwork.png', which depicts the resized image. Please note that, if applicable, the program has renamed files in that folder from earlier sessions, by appending a number to the end.)} {bold.bgGray.underline \n*** If you would like to add shaping to the file next, type 'npm run shapeify'}`
      );
    });
  });

//TODO: maybe add error check for this one too?

//TODO: //check with lab whether should include inhook etc. for kniterate or just forgo it (depending on backend stuff)
//TODO: add options for bind - off and cast - on(//? maybe if kniterate machine, make default cast-on waste yarn, and then otherwise, give option?)
//TODO: add option for fair isle and intarsia too (not just jacquard... also maybe minimal jacquard ?)

const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');
const imageColors = require('./image-color-quantize.js');
let machine, palette, color_count, init_dir, other_dir, needle_bed; //, bird, odd_bird, even_bird;
let colors_arr = [];
let knitout = [];
let row = [];
let carrier_passes = [];
let rows = [];
let jacquard_passes = [];
let caston = [];
let bindoff = [];

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
    machine = colors_arr.pop();
    palette = colors_arr.pop();
    color_count = palette.length;
    machine.includes('kniterate') ? ((needle_bed = 253), (init_dir = '+'), (other_dir = '-')) : ((needle_bed = 541), (init_dir = '-'), (other_dir = '+')); ////one extra so not counting from 0
    //TODO: check to see how many needles Shima SWG091N2 actually has (15 gauge, 36inch??)
  })
  .then((op, dir, bed, needle, carrier) => {
    for (let y = 0; y < colors_arr.length; ++y) {
      op = 'knit'; //TODO: make this vary
      bed = 'f'; //TODO: make this vary
      for (let x = 0; x < colors_arr[y].length; ++x) {
        needle = x + 1; ////so counting from 1 not 0
        carrier = colors_arr[y][x];
        row.push([needle, carrier]);
      }
      for (let i = 1; i <= color_count; ++i) {
        let carrier_pass = row.filter((n) => n[1] === i);
        carrier_passes.push(carrier_pass);
        carrier_pass = [];
      }
      rows.push(carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length)); ////?keep empty passes ?
      row = [];
      carrier_passes = [];
    }
    let passes_per_row = []; //? optional
    for (let i = 0; i < rows.length; ++i) {
      if (i % 2 !== 0) {
        rows[i].reverse();
      }
      passes_per_row.push(rows[i].length); //? optional
    }
    jacquard_passes = rows.flat();
    let row_count = 1; //? optional
    knitout.push(`;!row: ${row_count}`); //? optional
    let prev_row = 0; //? optional
    let taken;
    let inhook;
    let neg_carrier;
    for (let i = 0; i < jacquard_passes.length; ++i) {
      if (i === prev_row + passes_per_row[row_count - 1]) {
        //? optional
        row_count += 1; //TODO: see if this needs to start as two
        knitout.push(`;!row: ${row_count}`);
        prev_row = i;
      } //?
      i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);
      carrier = jacquard_passes[i][0][1];
      if (!knitout.some((el) => el === `inhook ${carrier}`) && machine.includes('shima') && carrier !== jacquard_passes[0][0][1]) {
        ////last one is to save inhook & releasehook for caston if first carrier
        knitout.push(`inhook ${carrier}`);
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
        if (i % 2 === 0 && !taken && x % 2 !== 0) {
          knitout.push(`knit ${dir} b${x} ${carrier}`);
        }
        if (i % 2 !== 0 && !taken && x % 2 === 0) {
          knitout.push(`knit ${dir} b${x} ${carrier}`);
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
            //TODO: determine whether it matters if first pass starts with needle on front bed
            x % 2 !== 0 ? caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
          }
        }
      } else {
        for (let x = colors_arr[0].length; x > 0; --x) {
          knitoutLines(x, 1);
          if (i === 0 || i === 1) {
            if (machine.includes('kniterate')) neg_carrier = carrier;
            x % 2 === 0 ? caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
          }
        }
      }
    }
    let carriers_str = '';
    let carriers_arr = [];
    for (let i = 1; i <= color_count; ++i) {
      carriers_str = `${carriers_str} ${i}`;
      carriers_arr.push(i);
    }
    if (machine.includes('shima')) {
      caston.unshift(`inhook ${jacquard_passes[0][0][1]}`); //new //?
      caston.push(`releasehook ${jacquard_passes[0][0][1]}`); //new //?
      knitout.unshift(caston);
    } else if (machine.includes('kniterate')) {
      let pass2 = caston[caston.length - 1];
      let kniterate_caston_base = `${caston.slice(0, caston.indexOf(`knit + f21 ${jacquard_passes[0][0][1]}`))},${caston.slice(
        caston.indexOf(`knit - f20 ${pass2.charAt(pass2.length - 1)}`),
        caston.length
      )}`; //TODO: figure out what to do if less than 21 needles are in work
      kniterate_caston_base = kniterate_caston_base.split(',');
      let kniterate_caston = [];
      for (let i = 0; i < color_count; ++i) {
        carrier = carriers_arr.shift();
        let carrier_caston = kniterate_caston_base.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
        i === 0 ? kniterate_caston.push(carrier_caston, carrier_caston) : kniterate_caston.push(carrier_caston);
      }
      kniterate_caston = kniterate_caston.flat();
      let waste_yarn_section = [];
      carrier = jacquard_passes[0][0][1];
      let waste_yarn = caston.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
      for (let i = 0; i < 35; ++i) {
        ////75 total passes
        waste_yarn_section.push(waste_yarn);
      }
      for (let i = 0; i < 14; ++i) {
        i % 2 !== 0 && i < 13 ? (dir = '-') : (dir = '+'); //check
        if (i === 13) carrier = neg_carrier; ////make draw thread the carrier that needs to end up on right side so its positioned there
        //TODO: ask lab whether should include kickback pass inbtw drop and draw thread since in same direction, or if backend will be able to figure that out
        if (dir === '+') {
          for (let x = 1; x <= colors_arr[0].length; ++x) {
            i !== 12 ? waste_yarn_section.push(`knit + f${x} ${carrier}`) : waste_yarn_section.push(`drop + b${x}`); //TODO: //check with lab whether drop is the right op
          }
        } else {
          for (let x = colors_arr[0].length; x > 0; --x) {
            waste_yarn_section.push(`knit - b${x} ${carrier}`);
          }
        }
      }
      waste_yarn_section = waste_yarn_section.flat();
      knitout.unshift(waste_yarn_section);
      knitout.unshift(kniterate_caston);
    }
    if (speed_number !== '-1') knitout.unshift(`x-speed-number ${speed_number}`);
    if (stitch_number !== '-1') knitout.unshift(`x-stitch-number ${stitch_number}`);
    knitout.unshift(`;!knitout-2`, `;;Machine: ${machine}`, `;;Carriers:${carriers_str}`); //TODO: ask lab whether Carriers heading should include all possible carriers or just the used ones
    if (machine.includes('shima')) {
      for (let i = 1; i <= carriers_arr.length; ++i) {
        let carrier_search = knitout.map((el) => el.includes(` ${i}`));
        let last = carrier_search.lastIndexOf(true);
        knitout.splice(last + 1, 0, `outhook ${i}`); //TODO: make sure this doesn't get thrown off by increasing splice (might need to increment ?)
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
      if (fs.existsSync(`./out-files/${input}`) || fs.existsSync(`./out-files/${input}.k`)) {
        overwrite = readlineSync.keyInYNStrict(
          chalk.black.bgYellow(`! WARNING:`) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`
        );
        return overwrite;
      }
      // if (!/\.k$/i.test(input)) {
      //   console.log(chalk.red(`-- ${input} is not a knitout (.k) file.\n`));
      // }
      if (!fs.existsSync(`./out-files/${input}`)) {
        // return /\.k$/i.test(input);
        return !fs.existsSync(`./out-files/${input}.k`);
      }
    });
    console.log(chalk.green(`-- Saving new file as: ${new_file}`));
    readlineSync.setDefaultOptions({ prompt: '' });
    if (new_file.includes('.')) new_file = new_file.slice(0, new_file.indexOf('.'));
    fs.writeFile(`./out-files/${new_file}.k`, knitout_str, function (err) {
      if (err) return console.log(err);
      console.log(chalk.green(`\nThe knitout file has successfully been written and can be found in the 'out-files' folder.\nOpen 'knit_motif.png' (located in the parent directory) to see a visual depiction of the knitting instructions.`));
    });
  });

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
let bindoff = [];
let last_pass_dir, xfer_needle, last_needle, bindoff_carrier;

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
    machine.includes('kniterate') ? ((needle_bed = 253), (init_dir = '+'), (other_dir = '-')) : ((needle_bed = 541), (init_dir = '-'), (other_dir = '+')); ////one extra so not counting from 0
  })
  .then((dir, needle, carrier) => {
    for (let y = 0; y < colors_arr.length; ++y) {
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
    for (let i = 0; i < jacquard_passes.length; ++i) {
      if (i === prev_row + passes_per_row[row_count - 1]) {
        row_count += 1;
        knitout.push(`;row: ${row_count}`);
        prev_row = i;
      }
      i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);
      carrier = jacquard_passes[i][0][1];
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
            //TODO: determine whether it matters if first pass starts with needle on front bed (todo: alter this since it does)
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
    let max_carriers;
    machine.includes('kniterate') ? (max_carriers = 6) : (max_carriers = 10); //TODO: add more options for this, or maybe take it from command-line input (i.e. stoll machines have anywhere from 8 - 16 carriers [maybe even > || < for some])
    for (let i = 1; i <= max_carriers; ++i) {
      carriers_str = `${carriers_str} ${i}`;
      carriers_arr.push(i);
    }
    if (machine.includes('shima')) {
      caston.unshift(`inhook ${jacquard_passes[0][0][1]}`);
      caston.push(`releasehook ${jacquard_passes[0][0][1]}`);
      knitout.unshift(caston);
    } else if (machine.includes('kniterate')) {
      let pass2 = caston[caston.length - 1];
      let kniterate_caston_base = `${caston.slice(0, caston.indexOf(`knit + f21 ${jacquard_passes[0][0][1]}`))},${caston.slice(
        caston.indexOf(`knit - f20 ${pass2.charAt(pass2.length - 1)}`),
        caston.length
      )}`; //TODO: add alternative for if less than 21 needles are in work
      kniterate_caston_base = kniterate_caston_base.split(',');
      let kniterate_caston = [];
      colors: for (let i = 0; i <= color_count; ++i) {
        if (i === 6) {
          break colors;
        }
        //// <= because add extra one for draw thread
        carrier = carriers_arr[i];
        color_carriers.push(carrier);
        let yarn_in = `in ${carrier}`;
        let carrier_caston = kniterate_caston_base.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
        i === 0 ? kniterate_caston.push(yarn_in, carrier_caston, carrier_caston) : kniterate_caston.push(yarn_in, carrier_caston);
      }
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
          waste_yarn_section.push(`;draw thread: ${color_carriers[color_carriers.length - 1]}`);
        } //TODO: if 6 colors are used, make draw thread the second carrier that needs to end up on right side so its positioned there
        if (dir === '+') {
          for (let x = 1; x <= colors_arr[0].length; ++x) {
            if (i === 13) {
              waste_yarn_section.push(`knit + f${x} ${color_carriers[color_carriers.length - 1]}`); ////draw thread
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
          bindoff.push(`knit + b${x} ${bindoff_carrier}`);
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
          bindoff.push(`knit - b${x} ${bindoff_carrier}`);
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
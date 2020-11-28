const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

let source_file;

readlineSync.setDefaultOptions({ prompt: chalk`{blue.bold \nWhat is the name of the file that you would like to error check? }` });
readlineSync.promptLoop(function (input) {
  if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
  input = `${input}.k`;
  source_file = input;
  if (!fs.existsSync(`./knit-out-files/${input}`) && !fs.existsSync(`./knit-out-files/${input}.k`)) {
    console.log(chalk`{red -- Input valid name of a knitout (.k) file that exists in the 'knit-out-files' folder, please.}`);
  }
  return fs.existsSync(`./knit-out-files/${input}`);
});
console.log(chalk.green(`-- Reading from: ${source_file}`));

let new_file = `./knit-out-files/${source_file.slice(0, source_file.indexOf('.'))}-error-check.k`;
console.log(new_file);

let fix = readlineSync.keyInYNStrict(chalk.blue.bold(`Would you like the program to automatically fix errors?`));

let in_file = fs
  .readFileSync('./knit-out-files/' + source_file)
  .toString()
  .split('\n');

let carriers = [];

let passes = [];
let pass_check = [];
let pass = [];
let bindoff = (dec_bind = tuck_time = false);
// let rows = [];
const OP = ({ TYPE, DIR, NEEDLE, CARRIER }) => ({
  TYPE,
  DIR,
  NEEDLE,
  CARRIER,
});
// let dir, needle, carrier; //check (moved) //? //TODO: deal with nulls
pass_loop: for (let i = 0; i < in_file.length; ++i) {
  if (in_file[i].includes('x-vis-color') && !carriers.includes(in_file[i].charAt(in_file[i].length - 1))) {
    carriers.push(in_file[i].charAt(in_file[i].length - 1));
  } //new
  if (!bindoff && (in_file[i] === `;bindoff section` || in_file[i] === `;short row section`)) {
    passes.push(pass);
    pass_check = [];
    pass = [];
    if (in_file[i] === `;short row section`) dec_bind = true; //TODO: add this for dec by bindoff method too
    bindoff = true;
  }
  // let pass_check = [];
  // let row = [];
  // let pass = [];
  // pass_loop: for (let p = 0; p < in_file[i].length; ++p) {
  let op_arr = in_file[i].split(' ');
  let type = op_arr[0];
  if (bindoff) {
    if (type === 'knit' && (in_file[i + 1].includes('xfer') || in_file[i + 1].includes('x-'))) {
      pass.push(in_file[i]); //new
      ++i;
      xfer: for (i; i < in_file.length; ++i) {
        if (in_file[i].includes('xfer')) {
          passes.push(pass);
          pass_check = [];
          pass = [];
          pass.push(`;pass: bindoff`); //new
          break xfer;
          // continue pass_loop;
        } else {
          pass.push(in_file[i]);
        }
      }
      // passes.push(pass);
      // pass_check = [];
      // pass = [];
      // pass.push(`;pass: bindoff`); //new
      continue pass_loop;
    }
    // if (type === 'knit' && in_file[i + 1].includes('xfer')) {
    //   passes.push(pass);
    //   pass_check = [];
    //   pass = [];
    //   pass.push(`;pass: bindoff`); //new
    //   continue pass_loop;
    // }
    if (type === 'xfer') {
      // xfer_skip: for (let x = i; x < in_file.length; ++x) {
      xfer_skip: for (i; i < in_file.length; ++i) {
        // if (in_file[x].includes('xfer') || in_file[x].includes('x-')) {
        pass.push(in_file[i]);
        // pass.push(in_file[x]);
        // ++i;
        // } else if (in_file[x].includes('tuck') && in_file[x + 1].includes('knit')) {
        if ((in_file[i].includes('knit') && in_file[i + 1].includes('xfer')) || (in_file[i].includes('tuck') && in_file[i + 1].includes('knit'))) {
          pass.push(in_file[i + 1]);
          tuck_time = true;
          i += 2;
          // if (in_file[x].includes('tuck') && in_file[x + 1].includes('knit')) {
          break xfer_skip;
          // pass.push(in_file[x]);
        }
      }
      // pass.push(in_file[i]);
      // continue pass_loop;
    }
    // if (type === 'tuck' && in_file[i + 1].includes('knit')) {
    // pass.push(in_file[i]);
    // ++i;
    let tail = false;
    if (tuck_time) {
      tuck_skip: for (i; i < in_file.length; ++i) {
        if (tail) {
          pass.push(in_file[i]);
          continue tuck_skip;
        }
        // tuck_skip: for (let x = i; x < in_file.length; ++x) {
        if (!in_file[i].includes(`knit`)) {
          // if (in_file[i + 1] === ';tail') tail = true;
          // if (!in_file[x].includes(`knit`)) {
          pass.push(in_file[i]);
          // ++i;
        } else {
          if (
            in_file[i + 1].includes('xfer') ||
            in_file[i + 1].includes('tuck') ||
            in_file[i + 1].includes('x-') ||
            in_file[i + 1].includes('out') ||
            in_file[i + 1].includes(';')
          ) {
            pass.push(in_file[i]);
            // if (in_file[i + 1] === ';tail') tail = true;
            // ++i;
          } else {
            passes.push(pass);
            pass_check = [];
            pass = [];
            tuck_time = false;
            // tuck_time = bindoff = false;
            break tuck_skip;
          }
        }
        if (in_file[i + 1] === ';tail') tail = true;
      }
      if (dec_bind) {
        console.log(pass);
        dec_bind = bindoff = tuck_time = false; //new
      }
    }
    if (tail) {
      passes.push(pass);
      break pass_loop;
    }
    // }
    // pass.push(in_file[i]);
    // pass.push(in_file[i + 1]);
    //TODO: add one big bindoff push
  }
  let dir, needle, carrier; //check (moved) //?
  if (type.includes(';') || type.includes('x-') || type.includes('out') || type.includes('in') || type === 'rack' || type === 'drop' || type === 'xfer') {
    pass.push(in_file[i]);
    //TODO: maybe push comments
    continue pass_loop;
  }
  // if (type !== 'xfer' && type !== 'drop') {
  op_arr[1] === '+' || '-'
    ? ((dir = op_arr[1]), (needle = op_arr[2]), op_arr.length < 4 ? (carrier = null) : (carrier = op_arr[3]))
    : ((dir = null), (needle = op_arr[1]), (carrier = null));
  // }
  let push_next = false;
  if (
    type === 'miss' &&
    !in_file[i + 1].includes(dir) &&
    in_file[i + 1].charAt(in_file[i + 1].length - 1) === carrier &&
    ((in_file[i + 2].includes(dir) && in_file[i + 2].charAt(in_file[i + 1].length - 1) === carrier && !in_file[i + 3].includes(dir)) ||
      in_file[i + 2].charAt(in_file[i + 2].length - 1) !== carrier)
  ) {
    push_next = true;
  }
  if (pass_check.length > 0 && (pass_check[pass_check.length - 1].DIR !== dir || pass_check[pass_check.length - 1].CARRIER !== carrier)) {
    // if (short_row_section && pass_check.length > 0) {
    //   //new
    //   if (rows.length < first_short_row - 1) {
    //     //new -1
    //     //TODO: check whether it should be <=
    //     let side;
    //     // pass_check[pass_check.length - 1].DIR === '+' ? (side = 'right') : (side = 'left');
    //     dir === '+' ? (side = 'right') : (side = 'left'); //new //TODO: determine if rest of code counts from 0 or 1 for rows
    //     let carrier_idx = final_carrier_pos.findIndex((el) => el.CARRIER == carrier);
    //     // if (!final_carrier_pos.some((el) => el.CARRIER == carrier)) {
    //     if (carrier !== null) {
    //       if (carrier_idx === -1) {
    //         //check & confirm that this is what findIndex returns
    //         final_carrier_pos.push(
    //           CARRIER_PARK({
    //             CARRIER: carrier,
    //             SIDE: side,
    //             ROW: rows.length,
    //             IDX: row.length,
    //           })
    //         );
    //       } else {
    //         final_carrier_pos[carrier_idx].SIDE = side;
    //         final_carrier_pos[carrier_idx].ROW = rows.length;
    //         final_carrier_pos[carrier_idx].IDX = row.length;
    //       }
    //     }
    //   }
    // } //new
    ///
    pass.unshift(`;pass: ${passes.length + 1}`); //new
    passes.push(pass);
    pass_check = [];
    pass = [];
    pass.push(in_file[i]);
  } else {
    pass_check.push(
      OP({
        TYPE: type,
        DIR: dir,
        NEEDLE: needle,
        CARRIER: carrier,
      })
    );
    pass.push(in_file[i]);
    if (push_next) {
      //new
      pass.push(in_file[i + 1]);
      ++i;
    }
  }
  // }
  // rows.push(row);
}
console.log(`carriers = ${carriers}`);

let carrier_track = [];
const FINDMYCARRIER = ({ PASS, CARRIER, DIR }) => ({
  PASS,
  CARRIER,
  DIR,
});

check: for (let i = 0; i < passes.length; ++i) {
  let op_arr;
  // let curr, next;
  knit: for (let x = 0; x < passes[i].length; ++x) {
    if (passes[i][x] === `;pass: bindoff`) {
      continue check;
    }
    if (passes[i][x].includes('knit')) {
      // let op_arr = in_file[i].split(' ');
      op_arr = passes[i][x].split(' ');
      break knit;
    }
  }
  // knit2: for (let x = 0; x < passes[i + 1].length; ++x) {
  //   if (passes[i + 1][x].includes('knit')) {
  //     next = passes[i + 1][x].split(' ');
  //     break knit2;
  //   }
  // }
  carrier: for (let c = 0; c < carriers.length; ++c) {
    if (op_arr[3] === carriers[c]) {
      let carrier_idx = carrier_track.findIndex((el) => el.CARRIER === carriers[c]);
      let dir = op_arr[1];
      // in_file[i].includes(' + ') ? (dir = '+') : (dir = '-');
      if (carrier_idx === -1) {
        carrier_track.push(
          FINDMYCARRIER({
            CARRIER: carriers[c],
            DIR: dir,
          })
        );
        // if (carrier_track.length < carriers.length) {
        //   if (!carrier_track.some(el => el.CARRIER === carriers[c])) {
        //     carrier_track.push()
        //   }
      } else {
        if (carrier_track[carrier_idx].DIR === dir) {
          // console.log(`will drop stitches!`); //remove
          if (fix) {
            let back_pass = [';back pass'];
            let otherN, leftN, rightN, interval;
            Number(op_arr[3]) % 2 === 0 ? (interval = 2) : (interval = 3);
            last_knit: for (let x = passes[i].length - 1; x >= 0; --x) {
              if (passes[i][x].includes('knit')) {
                // let op_arr = in_file[i].split(' ');
                otherN = Number(passes[i][x].split(' ')[2].slice(1));
                break last_knit;
              }
            }
            // dir === '+' ? ((leftN = Number(op_arr[2].slice(1))), (rightN = otherN)) : ((rightN = Number(op_arr[2].slice(1))), (leftN = otherN));
            if (dir === '-') {
              rightN = Number(op_arr[2].slice(1));
              leftN = otherN;
              for (let n = leftN; n <= rightN; n += interval) {
                back_pass.push(`knit + b${n} ${op_arr[3]}`);
                if (n + interval > rightN && n !== rightN) back_pass.push(`knit + b${rightN} ${op_arr[3]}`);
              }
            } else {
              leftN = Number(op_arr[2].slice(1));
              rightN = otherN;
              for (let n = rightN; n >= leftN; n -= interval) {
                back_pass.push(`knit - b${n} ${op_arr[3]}`);
                if (n - interval < leftN && n !== leftN) back_pass.push(`knit - b${leftN} ${op_arr[3]}`);
              }
            }
            passes[i].unshift(back_pass);
            passes[i].flat(); //check
          }
          passes[i].unshift(`;ERROR: will drop stitches`);
        }
        carrier_track[carrier_idx].DIR = dir;
      }
      break carrier;
    }
  }
}
// console.log(passes.length); //remove
// let bindoff_passes = passes.filter((p) => p.includes(`;pass: bindoff`)); //remove
// console.log(bindoff_passes.length); //remove
// console.log(bindoff_passes[0][bindoff_passes[0].length - 3], bindoff_passes[0][bindoff_passes[0].length - 2], bindoff_passes[0][bindoff_passes[0].length - 1]);

// for (let i = 0; i < in_file.length; ++i) {}

// for (let i = 0; i < in_file.length; ++i) {
//   carrier: for (let c = 0; c < carriers.length; ++c) {
//     if (in_file[i].charAt(in_file[i].length - 1) === carriers[c] && (in_file[i].includes(' + ') || in_file[i].includes(' - '))) {
//       let carrier_idx = carrier_track.findIndex((el) => el.CARRIER === carriers[c]);
//       let dir;
//       in_file[i].includes(' + ') ? (dir = '+') : (dir = '-');
//       if (carrier_idx === -1) {
//         carrier_track.push(
//           FINDMYCARRIER({
//             CARRIER: carriers[c],
//             DIR: dir,
//           })
//         );
//         // if (carrier_track.length < carriers.length) {
//         //   if (!carrier_track.some(el => el.CARRIER === carriers[c])) {
//         //     carrier_track.push()
//         //   }
//       } else {
//         carrier_track[carrier_idx].DIR = dir;
//       }
//       break carrier;
//     }
//   }
// }

let out_file = passes.flat();

out_file = JSON.stringify(out_file).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
out_file = out_file.join('\n');

//-------------------------
//***WRITE THE FINAL FILE !
//-------------------------
// fs.writeFile(`./knit-out-files/error_check.k`, out_file, function (err) {
fs.writeFile(new_file, out_file, function (err) {
  if (err) return console.log(err);
  console.log(chalk.green(`\nThe knitout file has successfully been altered and saved. The path to the new file is: '${new_file}'`));
});

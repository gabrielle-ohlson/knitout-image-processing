//TODO: add in feature to skip over backpasses for when the previous pass stops in the middle (i.e. when binding off for short rowing)
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

let new_file = `./knit-out-files/error-check/${source_file.slice(0, source_file.indexOf('.'))}-error-check.k`;
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
const OP = ({ TYPE, DIR, NEEDLE, CARRIER }) => ({
  TYPE,
  DIR,
  NEEDLE,
  CARRIER,
});

let header = [];//new
for (let i = 0; i < in_file.findIndex(el => el.includes('x-vis-color')); ++i) { //new
  header.push(in_file.shift());
}

pass_loop: for (let i = 0; i < in_file.length; ++i) {
  if (in_file[i].includes('x-vis-color') && !carriers.includes(in_file[i].charAt(in_file[i].length - 1))) {
    carriers.push(in_file[i].charAt(in_file[i].length - 1));
  } //new
  if (in_file[i].includes(`;inc`) || in_file[i].includes(`;dec`)) {
    //new
    pass.unshift(`;pass: ${passes.length + 1}`); //new
    passes.push(pass);
    pass_check = [];
    pass = [];
    pass.push(`;pass: shaping`); //new
    shape: for (i; i < in_file.length; ++i) {
      if (!in_file[i].includes(`knit`)) {
        pass.push(in_file[i]);
      } else {
        if (!in_file[i + 1].includes(`knit`)) {
          pass.push(in_file[i]);
        } else {
          let dir1 = in_file[i].split(' ')[1];
          let dir2 = in_file[i + 1].split(' ')[1];
          if (dir1 === dir2) {
            //check whether it starts with a backwards loop
            passes.push(pass);
            pass_check = [];
            pass = [];
            break shape;
          } else {
            pass.push(in_file[i]);
          }
        }
      }
    }
  }
  if (!bindoff && (in_file[i] === `;bindoff section` || in_file[i] === `;short row section`)) {
    pass.unshift(`;pass: ${passes.length + 1}`); //new
    passes.push(pass);
    pass_check = [];
    pass = [];
    if (in_file[i] === `;short row section`) dec_bind = true; //TODO: add this for dec by bindoff method too
    bindoff = true;
  }
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
          pass.push(`;pass: bindoff`);
          break xfer;
        } else {
          pass.push(in_file[i]);
        }
      }
      continue pass_loop;
    }
    if (type === 'xfer') {
      xfer_skip: for (i; i < in_file.length; ++i) {
        pass.push(in_file[i]);
        if ((in_file[i].includes('knit') && in_file[i + 1].includes('xfer')) || (in_file[i].includes('tuck') && in_file[i + 1].includes('knit'))) {
          pass.push(in_file[i + 1]);
          tuck_time = true;
          i += 2;
          break xfer_skip;
        }
      }
    }
    let tail = false;
    if (tuck_time) {
      tuck_skip: for (i; i < in_file.length; ++i) {
        if (tail) {
          pass.push(in_file[i]);
          continue tuck_skip;
        }
        if (!in_file[i].includes(`knit`)) {
          pass.push(in_file[i]);
        } else {
          if (
            in_file[i + 1].includes('xfer') ||
            in_file[i + 1].includes('tuck') ||
            in_file[i + 1].includes('x-') ||
            in_file[i + 1].includes('out') ||
            in_file[i + 1].includes(';')
          ) {
            pass.push(in_file[i]);
          } else {
            passes.push(pass);
            pass_check = [];
            pass = [];
            tuck_time = false;
            break tuck_skip;
          }
        }
        if (in_file[i + 1] === ';tail') tail = true;
      }
      if (dec_bind) {
        // console.log(pass);
        dec_bind = bindoff = tuck_time = false; //new
      }
    }
    if (tail) {
      passes.push(pass);
      break pass_loop;
    }
  }
  let dir, needle, carrier; //check (moved) //?
  if (type.includes(';') || type.includes('x-') || type.includes('out') || type.includes('in') || type === 'rack' || type === 'drop' || type === 'xfer') {
    pass.push(in_file[i]);
    continue pass_loop;
  }
  op_arr[1] === '+' || '-'
    ? ((dir = op_arr[1]), (needle = op_arr[2]), op_arr.length < 4 ? (carrier = null) : (carrier = op_arr[3]))
    : ((dir = null), (needle = op_arr[1]), (carrier = null));
  let push_next = false;
  //   knit - f11 3
  // miss - f10 3
  // ;pass: 601
  // knit + f10 3 +1
  // knit - f9 3 +2
  if (
    type === 'miss' &&
    !in_file[i + 1].includes(` ${dir} `) &&
    in_file[i + 1].charAt(in_file[i + 1].length - 1) === carrier &&
    ((in_file[i + 2].charAt(in_file[i + 2].length - 1) === carrier &&
      ((in_file[i + 2].includes(dir) && in_file[i + 2].charAt(in_file[i + 2].length - 1) === carrier) ||
        (in_file[i + 3].includes(dir) && in_file[i + 3].charAt(in_file[i + 3].length - 1) === carrier))) ||
      // ((in_file[i + 2].includes(dir) && in_file[i + 2].charAt(in_file[i + 1].length - 1) === carrier && !in_file[i + 3].includes(` ${dir} `)) ||
      in_file[i + 2].charAt(in_file[i + 2].length - 1) !== carrier)
  ) {
    push_next = true;
  }
  if (pass_check.length > 0 && (pass_check[pass_check.length - 1].DIR !== dir || pass_check[pass_check.length - 1].CARRIER !== carrier)) {
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
}
console.log(`carriers = ${carriers}`); //remove

let carrier_track = [];
const FINDMYCARRIER = ({ PASS, CARRIER, DIR }) => ({
  PASS,
  CARRIER,
  DIR,
});

check: for (let i = 0; i < passes.length; ++i) {
  let op_arr;
  knit: for (let x = 0; x < passes[i].length; ++x) {
    if (passes[i][x] === `;pass: bindoff` || passes[i][x] === `;pass: shaping`) {
      continue check;
    }
    if (passes[i][x].includes('knit')) {
      if (op_arr === undefined) {
        //new
        op_arr = passes[i][x].split(' ');
      } else {
        if (passes[i][x].includes(` ${op_arr[1]} `)) {
          break knit;
        } else {
          op_arr = passes[i][x].split(' ');
        }
      }
      // op_arr = passes[i][x].split(' ');
      // break knit;
    }
  }
  carrier: for (let c = 0; c < carriers.length; ++c) {
    if (op_arr[3] === carriers[c]) {
      let carrier_idx = carrier_track.findIndex((el) => el.CARRIER === carriers[c]);
      let dir = op_arr[1];
      if (carrier_idx === -1) {
        // console.log(passes[i][0].split(' ')[1]); //remove
        carrier_track.push(
          FINDMYCARRIER({
            PASS: passes[i][0].split(' ')[1],
            CARRIER: carriers[c],
            DIR: dir,
          })
        );
      } else {
        if (carrier_track[carrier_idx].DIR === dir) {
          if (fix) {
            let back_pass = [';back pass'];
            let otherN, leftN, rightN, interval;
            Number(op_arr[3]) % 2 === 0 ? (interval = 2) : (interval = 3);
            last_knit: for (let x = passes[i].length - 1; x >= 0; --x) {
              if (passes[i][x].includes('knit')) {
                otherN = Number(passes[i][x].split(' ')[2].slice(1));
                break last_knit;
              }
            }
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
            ////new
            if (carrier_track[carrier_idx].PASS !== '-') {
              passes[i].unshift(back_pass);
              passes[i].flat();
            }
            ////
            // passes[i].unshift(back_pass);
            // passes[i].flat();
          }
          if (carrier_track[carrier_idx].PASS !== '-') passes[i].unshift(`;ERROR: will drop stitches (see pass: ${carrier_track[carrier_idx].PASS})`);
        }
        carrier_track[carrier_idx].PASS = passes[i][0].split(' ')[1];
        carrier_track[carrier_idx].DIR = dir;
      }
      break carrier;
    }
  }
}

passes.unshift(header); //new
let out_file = passes.flat();

out_file = JSON.stringify(out_file).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
out_file = out_file.join('\n');

//-------------------------
//***WRITE THE FINAL FILE !
//-------------------------
fs.writeFile(new_file, out_file, function (err) {
  if (err) return console.log(err);
  console.log(chalk.green(`\nThe knitout file has successfully been altered and saved. The path to the new file is: '${new_file}'`));
});

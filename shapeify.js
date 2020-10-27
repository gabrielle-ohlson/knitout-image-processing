const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

let errors = false;
//--------------------------------------------------------------------------------------
//***RUN/GET VARIABLES FROM SHAPE-PROCESSOR.JS OR SHAPE-TEMPLATES.JS, EXTRACT SHAPE INFO
//--------------------------------------------------------------------------------------
let {
  shape_code,
  shape_code_reverse,
  shortrow_code, //new
  short_row_section,
  first_short_row,
  last_short_row,
  shape_error,
  shape_err_row,
} = require('./shape-processor');

let shaping_arr = [];
const SHAPING = ({ ROW, LEFT, RIGHT }) => ({
  ROW,
  LEFT,
  RIGHT,
});
let left_shortrow_arr = [];
let right_shortrow_arr = [];
// console.log(`SHAPE_CODE:\n${shape_code_reverse}`); //remove
// console.log(`SHORT_ROW:\n${shortrow_code}`); //remove
// console.log(`SHORTING ROWING IS: ${short_row_section}`); //remove

if (fs.existsSync('INPUT_DATA.json')) {
  fs.unlinkSync('INPUT_DATA.json');
  console.log('Clearing pixel data...');
}
if (fs.existsSync('cropped_shape.png')) {
  fs.unlinkSync('cropped_shape.png');
  console.log('Clearing image data...');
}

///////////////////////
let Template;
let piece_code1;
let piece_shortrow_codeL;
let piece_shortrow_codeR;
// let pieces_arr;
if (shape_code === null) {
  Template = require('./shape-templates');
  piece_code1 = Object.values(Template.piece_obj1);
  piece_shortrow_codeL = Object.values(Template.piece_shortrow_objL);
  piece_shortrow_codeR = Object.values(Template.piece_shortrow_objR);
  pieces_arr = Object.values(Template.pieces_arr);
  shape_code_reverse = [...piece_code1];
  shortrow_code = [...piece_shortrow_codeL];
  first_short_row = shape_code_reverse.length;
  last_short_row = first_short_row + shortrow_code.length - 1;
  short_row_section = true;
}
//-------------------------
let shortrow_sides = [];
let shortrow_bindoff = [];
function shortRowSides(code) {
  shortrow_sides = [];
  for (let r = 0; r < code.length; ++r) {
    let idx_arr = [];
    let z = 0;
    code[r].forEach((element) => {
      if (element === 1) {
        idx_arr.push(code[r].indexOf(element, z));
      }
      ++z;
    });
    let short_arr = [];
    for (let i = 0; i < idx_arr.length; ++i) {
      if (idx_arr[i] !== idx_arr[i - 1] + 1 || idx_arr[i] !== idx_arr[i + 1] - 1) {
        short_arr.push(idx_arr[i]);
      }
    }
    shortrow_sides.push(short_arr);
  }
  shortrow_bindoff.push(shortrow_sides[0][1], shortrow_sides[0][2]);
}
/////left side
function shortRowInfo(left, right, arr, main_left, main_right) {
  for (let r = 0; r < shortrow_sides.length; ++r) {
    let shape_left_dec = 0;
    let shape_left_inc = 0;
    let shape_right_dec = 0;
    let shape_right_inc = 0;
    let curr_row = shortrow_sides[r];
    let prev_row = shortrow_sides[r - 1];
    if (r > 0) {
      if (curr_row[left] !== prev_row[left]) {
        //0, but now left
        curr_row[left] > prev_row[left] ? (shape_left_dec = prev_row[left] - curr_row[left]) : (shape_left_inc = prev_row[left] - curr_row[left]);
      }
      if (curr_row[right] !== prev_row[right]) {
        //1, but now right
        curr_row[right] < prev_row[right] ? (shape_right_dec = curr_row[right] - prev_row[right]) : (shape_right_inc = curr_row[right] - prev_row[right]);
      }
    } else {
      if (curr_row[left] !== main_left && main_left !== null) {
        //0, but now left
        curr_row[left] > main_left ? (shape_left_dec = main_left - curr_row[left]) : (shape_left_inc = main_left - curr_row[left]);
      }
      if (curr_row[right] !== main_right && main_right !== null) {
        //1, but now right
        curr_row[right] < main_right ? (shape_right_dec = curr_row[right] - main_right) : (shape_right_inc = curr_row[right] - main_right);
      }
    }
    let shaping = SHAPING({
      ROW: shape_code_reverse.length + r,
      LEFT: shape_left_dec + shape_left_inc, ////if >0 (pos), then it's an inc. if <0 (neg). then it's a dec.
      RIGHT: shape_right_dec + shape_right_inc,
    });
    arr.push(shaping);
  }
}
// -----------------------------
function shapeInfo(code, arr) {
  for (let i = 0; i < code.length; ++i) {
    let shape_left_dec = 0;
    let shape_left_inc = 0;
    let shape_right_dec = 0;
    let shape_right_inc = 0;
    let shape_knit = true;
    let left_px1 = code[i].indexOf(1); ////first black px
    let right_px1 = code[i].lastIndexOf(1); ////last black px
    let prev_left;
    let prev_right;
    if (i > 0) {
      prev_left = code[i - 1].indexOf(1);
      prev_right = code[i - 1].lastIndexOf(1);
    }
    const MAIN = ({ shape_left_dec, shape_left_inc, shape_knit, shape_right_dec, shape_right_inc } = shapingDetection(
      i,
      left_px1,
      shape_left_dec,
      shape_left_inc,
      shape_knit,
      right_px1,
      shape_right_dec,
      shape_right_inc,
      prev_left,
      prev_right
    ));
    if (!shape_knit) {
      //new
      let shaping = SHAPING({
        ROW: i,
        LEFT: MAIN.shape_left_dec + MAIN.shape_left_inc, //if >0 (pos), then it's an inc. if <0 (neg). then it's a dec.
        RIGHT: MAIN.shape_right_dec + MAIN.shape_right_inc,
      });
      arr.push(shaping);
    }
  }
}
////FUNCTION FOR DETECTION SHAPING PARAMETERS FOR ACTIVE ROWS FROM SHAPE-PROCESSOR IMAGE
function shapingDetection(
  i,
  left_px1,
  shape_left_dec,
  shape_left_inc,
  shape_knit,
  right_px1,
  shape_right_dec,
  shape_right_inc,
  prev_left,
  prev_right
) {
  if (i > 0 && left_px1 !== prev_left) {
    if (left_px1 > prev_left) {
      shape_left_dec = prev_left - left_px1;
      shape_knit = false;
    } else {
      shape_left_inc = prev_left - left_px1;
      shape_knit = false;
    }
  }
  if (i > 0 && right_px1 !== prev_right) {
    if (right_px1 < prev_right) {
      shape_right_dec = right_px1 - prev_right;
      shape_knit = false;
    } else {
      shape_right_inc = right_px1 - prev_right;
      shape_knit = false;
    }
  }
  return { shape_left_dec, shape_left_inc, shape_knit, shape_right_dec, shape_right_inc };
}
//-------
if (shape_code_reverse !== null) {
  shapeInfo(shape_code_reverse, shaping_arr); //main body
  if (short_row_section) {
    if (shape_code !== null) {
      shortRowSides(shortrow_code);
      shortRowInfo(0, 1, left_shortrow_arr, shape_code_reverse[shape_code_reverse.length - 1].indexOf(1), null); //left side
      shortRowInfo(2, 3, right_shortrow_arr, null, shape_code_reverse[shape_code_reverse.length - 1].lastIndexOf(1)); ////right side
    } else {
      shortRowSides(shortrow_code);
      shortRowInfo(0, 1, left_shortrow_arr, shape_code_reverse[shape_code_reverse.length - 1].indexOf(1), null); //left side
      shortrow_code = [...piece_shortrow_codeR]; //new
      shortRowSides(shortrow_code);
      shortRowInfo(0, 1, right_shortrow_arr, null, shape_code_reverse[shape_code_reverse.length - 1].lastIndexOf(1)); ////right side
    }
    shortrow_bindoff = shortrow_bindoff.filter((e) => e);
  }
}
// console.log(shaping_arr); //remove
// console.log(left_shortrow_arr); //remove
// console.log(right_shortrow_arr); //remove
// console.log(shortrow_bindoff); //remove
// console.log(`first short row: ${first_short_row}`); //remove
// console.log(`last short row: ${last_short_row}`); //remove
// console.log(shaping_arr[shaping_arr.length - 1].ROW); //remove

//-------------------------------------------------------------
//***GET USER INPUT (IN FILE & SAVE AS) AND WRITE FILE TO ARRAY
//-------------------------------------------------------------
let source_file, source_dir;
if (fs.existsSync('SOURCE_FILE.txt')) {
  console.log('Reading source file data...');
  let source_data = fs.readFileSync('SOURCE_FILE.txt').toString().split('\n');
  source_file = source_data[0];
  source_dir = source_data[1];
  fs.unlinkSync('SOURCE_FILE.txt');
}
//TODO: limit it to creating new files or just editing ones produced by image processing program (and remove option of pulling from 'knit-in-files' folder)
if (source_file === undefined) {
  readlineSync.setDefaultOptions({ prompt: chalk`{blue.bold \nWhat is the name of the file that you would like to add shaping to? }` });
  readlineSync.promptLoop(function (input) {
    if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
    input = `${input}.k`;
    source_file = input;
    if (
      !fs.existsSync(`./knit-out-files/${input}`) &&
      !fs.existsSync(`./knit-out-files/${input}.k`) &&
      !fs.existsSync(`./knit-in-files/${input}`) &&
      !fs.existsSync(`./knit-in-files/${input}.k`)
    ) {
      console.log(chalk`{red -- Input valid name of a knitout (.k) file that exists in either the 'knit-out-files' or 'knit-in-files' folder, please.}`);
    }
    if (fs.existsSync(`./knit-in-files/${input}`)) {
      source_dir = './knit-in-files/';
    } else if (fs.existsSync(`./knit-out-files/${input}`)) {
      source_dir = './knit-out-files/';
    }
    return fs.existsSync(`./knit-out-files/${input}`) || fs.existsSync(`./knit-in-files/${input}`);
  });
  console.log(chalk.green(`-- Reading from: ${source_file}`));
}

readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nSave new file as: ') });
let new_file, overwrite;
readlineSync.promptLoop(function (input) {
  if (input.includes('.')) input = input.slice(0, input.indexOf('.'));
  input = `${input}.k`;
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

let in_file = fs
  .readFileSync(source_dir + source_file)
  .toString()
  .split(';r');
for (let i = 0; i < in_file.length; ++i) {
  in_file[i] = in_file[i].split('\n');
  in_file[i] = in_file[i].filter((el) => !el.includes('ow:'));
}
let caston_section = in_file.shift();

let bindoff_section = in_file[in_file.length - 1].splice(in_file[in_file.length - 1].indexOf(`;bindoff section`)); //new!!! //need to double check this

//--------------------------------------------
//***CREATE ARRAY OF CARRIERS USED IN THE FILE
//--------------------------------------------
let carriers = [];
in_file.forEach((arr) =>
  arr.map((element) => {
    if (element.includes('+') || element.includes('-')) {
      carriers.push(element.charAt(element.length - 1));
    }
  })
);
carriers = [...new Set(carriers)];
carriers = carriers.sort((a, b) => a - b);

//--------------------------------------------------------
//***GET USER INPUT (PREFERNCES/MACHINE SPECS/SWATCH INFO)
//--------------------------------------------------------
// let bindoff_carrier;
// let carrier_opts = Array.from(carriers),
//   bindoff_c = readlineSync.keyInSelect(carrier_opts, chalk.blue.bold(`\nWhich carrier would you like to use for bind-offs?`));
// console.log(chalk.green(`-- Binding off with carrier ${carrier_opts[bindoff_c]}`));
// bindoff_carrier = carrier_opts[bindoff_c];

let sinkers = readlineSync.keyInYNStrict(
  chalk`{blue.bold \nDoes the machine you are using have sinkers?} {blue.italic (If you are using a kniterate machine, the answer is no [enter 'n']. Otherwise, the answer is likely yes [enter 'y'], but you should double-check to ensure no damage is done to your machine during short-rowing.)}`
);

//-------------------------------------------------------------------------------------------------------
//***FOR KNITERATE: CREATE ARRAY OF CARRIERS AVAILABLE TO USE FOR SHORT ROWING, & THROW ERR IF NOT ENOUGH
//-------------------------------------------------------------------------------------------------------
let short_row_carriers = ['1', '2', '3', '4', '5', '6'];
// for (let c = 1; c <= 6; ++c) {
//   c = c.toString();
//   if (!carriers.includes(c)) {
//     short_row_carriers.push(c);
//   }
//   c = Number(c);
// }

if (short_row_section) {
  for (let r = first_short_row; r <= last_short_row; ++r) {
    for (let c = 1; c <= 6; ++c) {
      c = c.toString();
      in_file[r].map((element) => {
        if ((element.includes('+') || element.includes('-')) && element.charAt(element.length - 1) === c) {
          short_row_carriers = short_row_carriers.filter((el) => el !== c);
        }
      });
      c = Number(c);
    }
  }
}
// console.log(`shortrowcarriers = ${short_row_carriers}`); //remove ////only for kniterate

if (short_row_carriers.length < 3 && short_row_section && !sinkers) {
  console.log(
    chalk`{red.bold \nERR:} {red the section of the panel that will be altered to include short-rowing contains ${short_row_carriers.length} colors, but the maximum color-count for that section is 3 (to allow for separate carriers to work either side while short-rowing).}`
  );
  errors = true;
}

//---------------------------------------------------------
//***SPLIT FILE INTO ARRAY OF ROWS WITH SUBARRAYS OF PASSES
//---------------------------------------------------------
let rows = [];
const OP = ({ TYPE, DIR, NEEDLE, CARRIER }) => ({
  TYPE,
  DIR,
  NEEDLE,
  CARRIER,
});
for (let i = 0; i < in_file.length; ++i) {
  let pass_check = [];
  let row = [];
  let pass = [];
  for (let p = 0; p < in_file[i].length; ++p) {
    let op_arr = in_file[i][p].split(' ');
    let type = op_arr[0];
    let dir, needle, carrier;
    if (type.includes('hook')) {
      dir = needle = null;
      op_arr.length > 2 ? (carrier = op_arr.slice(1)) : (carrier = op_arr[1]);
    } else if (type !== 'xfer') {
      op_arr[1] === '+' || '-'
        ? ((dir = op_arr[1]), (needle = op_arr[2]), op_arr.length < 4 ? (carrier = null) : (carrier = op_arr[3]))
        : ((dir = null), (needle = op_arr[1]), (carrier = null));
    }
    if (pass_check.length > 0 && (pass_check[pass_check.length - 1].DIR !== dir || pass_check[pass_check.length - 1].CARRIER !== carrier)) {
      row.push(pass);
      pass_check = [];
      pass = [];
      pass.push(in_file[i][p]);
    } else {
      pass_check.push(
        OP({
          TYPE: type,
          DIR: dir,
          NEEDLE: needle,
          CARRIER: carrier,
        })
      );
      pass.push(in_file[i][p]);
    }
    //TODO: add support for xfer ?
  }
  rows.push(row);
}

//----------------------------------------------------------------------------
//***DETERMINE IF SINGLE OR DOUBLE BED; IDENTIFY THE LEFT & RIGHT MOST NEEDLES
//----------------------------------------------------------------------------
let needle_count_arr = rows.flat(2);
let double_bed;
needle_count_arr.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false); //check

needle_count_arr = needle_count_arr.map((el) => el.match(/\d+/g));
needle_count_arr = needle_count_arr.map((arr) => arr.splice(0, 1));
needle_count_arr = needle_count_arr.map((el) => Number(el));
function getMax(arr) {
  let len = arr.length;
  let max = -Infinity;
  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
};
function getMin(arr) {
  let min = arr[0];
  for (let idx = 0; idx < arr.length; ++idx) {
    min = arr[idx] < min ? arr[idx] : min;
  }
  return min;
}
const R_NEEDLE = getMax(needle_count_arr);
// const R_NEEDLE = Math.max(...needle_count_arr);
const L_NEEDLE = getMin(needle_count_arr);
// const L_NEEDLE = Math.min(...needle_count_arr);

//----------------------------
//***PROTO STACK DEC FUNCTIONS
//----------------------------
const LEFT_XFER = (xfer_section, xfer_needle, count, from, rack, alt) => {
  for (let x = xfer_needle; x < xfer_needle + count; ++x) {
    if (alt === true && (x - xfer_needle) % 2 !== 0) {
      continue;
    } else {
      from === 'f' ? xfer_section.push(`xfer f${x + rack} b${x}`) : xfer_section.push(`xfer b${x} f${x + rack}`);
    }
  }
};
const RIGHT_XFER = (xfer_section, xfer_needle, count, from, rack, alt) => {
  for (let x = xfer_needle; x > xfer_needle - count; --x) {
    if (alt === true && (xfer_needle - x) % 2 !== 0) {
      continue;
    } else {
      from === 'f' ? xfer_section.push(`xfer f${x + rack} b${x}`) : xfer_section.push(`xfer b${x} f${x + rack}`);
    }
  }
};
let xfer_section = [];
////dec 1 ? count = 3 & rack = 1; dec2 ? count = 4 & rack = 2;
const decSingleBed = (dec_needle1, count1, rack1, side, dec_needle2, count2, rack2) => {
  ////dec_needle2 & count2 could be null (if only dec on one side); if not null, should be right dec needle
  if (side === 'left') {
    LEFT_XFER(xfer_section, dec_needle1, count1, 'f', 0, false);
    xfer_section.push(`rack ${rack1}`);
    LEFT_XFER(xfer_section, dec_needle1, count1, 'b', rack, false);
  } else if (side === 'right') {
    RIGHT_XFER(xfer_section, dec_needle1, count1, 'f', 0, false);
    xfer_section.push(`rack -${rack1}`);
    RIGHT_XFER(xfer_section, dec_needle1, count1, 'b', -rack, false);
  } else {
    ////both
    LEFT_XFER(xfer_section, dec_needle1, count1, 'f', 0, false);
    RIGHT_XFER(xfer_section, dec_needle2, count2, 'f', 0, false);
    xfer_section.push(`rack ${rack1}`);
    LEFT_XFER(xfer_section, dec_needle1, count1, 'b', rack, false);
    xfer_section.push(`rack -${rack2}`);
    RIGHT_XFER(xfer_section, dec_needle2, count2, 'b', -rack, false);
  }
  xfer_section.push(`rack 0`);
};
////////////////
////dec 1 ? count = 3 (w/alt), then 2 & rack = 1, then 2; dec2 ? count =  & rack = ;
const dec1DoubleBed = (dec_needle, side) => {
  ////if double bed, need to just do it twice
  if (side === 'left') {
    xfer_section.push(`rack 1`);
    LEFT_XFER(xfer_section, dec_needle - 1, 3, 'f', 1, true); ////-1 so const function (with rack param adjustment) still works
    xfer_section.push(`rack 2`);
    LEFT_XFER(xfer_section, dec_needle - 1, 2, 'b', 2, false);
  }
  if (side === 'right') {
    xfer_section.push(`rack -1`);
    RIGHT_XFER(xfer_section, dec_needle + 1, 3, 'f', -1, true);
    xfer_section.push(`rack -2`);
    RIGHT_XFER(xfer_section, dec_needle + 1, 2, 'b', -2, false);
  }
  xfer_section.push(`rack 0`);
};

const dec2DoubleBed = (dec_needle, side) => {
  ////dec_needle2 & count2 could be null (if only dec on one side); if not null, should be right dec needle
  if (side === 'left') {
    LEFT_XFER(xfer_section, dec_needle + 1, 1, 'f', 0, false); ////+1 so const function (with rack param adjustment) still works
    xfer_section.push(`rack 1`);
    LEFT_XFER(xfer_section, dec_needle, 1, 'b', 1, false);
    xfer_section.push(`rack -2`);
    LEFT_XFER(xfer_section, dec_needle + 2, 3, 'f', -2, false);
    xfer_section.push(`rack 1`);
    LEFT_XFER(xfer_section, dec_needle + 1, 1, 'b', 1, false);
  } else if (side === 'right') {
    RIGHT_XFER(xfer_section, dec_needle - 1, 1, 'f', 0, false);
    xfer_section.push(`rack -1`);
    RIGHT_XFER(xfer_section, dec_needle, 1, 'b', -1, false);
    xfer_section.push(`rack 2`);
    RIGHT_XFER(xfer_section, dec_needle - 2, 3, 'f', 2, false);
    xfer_section.push(`rack -1`);
    RIGHT_XFER(xfer_section, dec_needle - 1, 1, 'b', -1, false);
  }
  xfer_section.push(`rack 0`);
};

//--------------------------
//***PROTO BIND-OFF FUNCTION
//--------------------------
let bindoff_carrier;
// const BINDOFF = (xfer_needle, count, side, double_bed, bindoff_carrier) => { //TODO: make bindoff_carrier variable(whatever carrier is on the correct side, so I think that's the carrier that was used in the last pass??)
const BINDOFF = (xfer_needle, count, side, double_bed) => {
  if (side === 'right') {
    xfer_needle = xfer_needle - count + 1; //-1 //?
  }
  const posLoop = (op, bed) => {
    for (let x = xfer_needle; x < xfer_needle + count; ++x) {
      if (op === 'knit') {
        xfer_section.push(`knit + ${bed}${x} ${bindoff_carrier}`);
      }
      if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
      }
      if (op === 'bind') {
        xfer_section.push(`xfer b${x} f${x}`);
        xfer_section.push(`rack -1`);
        xfer_section.push(`xfer f${x} b${x + 1}`);
        xfer_section.push(`rack 0`);
        xfer_section.push(`knit + b${x} ${bindoff_carrier}`);
      }
    }
  };
  const negLoop = (op, bed) => {
    for (let x = xfer_needle + count - 1; x >= xfer_needle; --x) {
      if (op === 'knit') {
        xfer_section.push(`knit - ${bed}${x} ${bindoff_carrier}`);
      }
      if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
      }
      if (op === 'bind') {
        xfer_section.push(`xfer b${x} f${x}`);
        xfer_section.push(`rack 1`);
        xfer_section.push(`xfer f${x} b${x - 1}`); //new (-1 instead of + 1)
        xfer_section.push(`rack 0`);
        xfer_section.push(`knit - b${x} ${bindoff_carrier}`);
      }
    }
  };
  if (side === 'left') {
    posLoop('knit', 'f');
    if (double_bed) negLoop('knit', 'f');
    if (double_bed) posLoop('knit', 'b');
    negLoop('xfer', 'f'); //? kickback?
    negLoop('knit', 'b');
    posLoop('bind', null);
  } else if (side === 'right') {
    negLoop('knit', 'f');
    if (double_bed) posLoop('knit', 'f');
    if (double_bed) negLoop('knit', 'b');
    posLoop('xfer', 'f'); //? kickback?
    posLoop('knit', 'b');
    negLoop('bind', null);
  }
};
// // Basic stack bind-off
// function bindOff() {
//   for (let s = leftSide_rightN + 1; s <= rightSide_leftN; ++s) {
//     k.xfer('f' + s, 'b' + s);
//     k.rack(1);
//     k.xfer('b' + s, 'f' + (s + 1));
//     k.rack(0.25);
//     if ((s - leftSide_rightN) % 2 === 1) {
//       k.tuck('+', 'b' + s, carrier);
//     }
//     // Don't knit last needle until short rows (but do transfer) for smoother transition
//     if (s + 1 < rightSide_leftN) {
//       k.knit('+', 'f' + (s + 1), carrier);
//     }
//     // Make sure not miss after last needle
//     if (s + 2 <= rightSide_leftN) {
//       k.miss('+', 'f' + (s + 2), carrier);
//     }
//     k.rack(0);
//   }
// }

//----------------------
//***PROTO INC FUNCTIONS
//----------------------
// const incSingleBed = (inc_needles1, side, inc_needles2) => {
// }

// const incDoubleBed = (inc_needles1, side, inc_needles2) => {
// }

//---------------------------
//***INSERT TRANSFER SECTIONS
//---------------------------
let left_dec = true; ////for now
let right_dec = true;
let xtype, left_dec_count, right_dec_count, dec_row_interval;
function parseShape(arr, r) {
  arr.some((element) => {
    if (element.ROW === r) {
      if (element.LEFT > 0 || element.RIGHT > 0) {
        xtype = 'inc';
        console.log(
          chalk`{red.bold \nERR:} {red AT ROW ${r}: custom shape includes increasing, which this program does not currently support. Will hopefully fix this issue soon, but for now, please upload a shape that only uses decreases.}`
        );
        errors = true;
      } else {
        xtype = 'dec';
      }
      left_dec = right_dec = false; ////for now
      left_dec_count = right_dec_count = 0; ////for now
      if (element.RIGHT !== 0) {
        // left_dec_count = 0; //NEW
        right_dec_count = -element.RIGHT; //NEW
        // dec_count_num = -element.RIGHT; //TODO: change dec_count_num to be for dec and inc or add separate variables / functions for increases
        right_dec = true;
        // left_dec = false;
      }
      if (element.LEFT !== 0) {
        left_dec_count = -element.LEFT; //NEW
        left_dec = true;
        // right_dec_count = 0; //NEW
        // right_dec = false;
        // } else {
        // left_dec_count = -element.LEFT; //NEW
        // right_dec_count = -element.RIGHT; //NEW
        // left_dec = true;
        // right_dec = true;
      }
      if (arr.indexOf(element) < arr.length - 1) {
        let next_element = arr.indexOf(element) + 1;
        dec_row_interval = arr[next_element].ROW - element.ROW;
      } else {
        dec_row_interval = 1;
      }
    }
  });
}

let left_bindC, right_bindC;
function insertXferPasses(left, right, xtype) {
  let xfer_needle1, xcount1, xfer_needle2, xcount2, side, stitches1, stitches2;
  if (left === null) {
    bindoff_carrier = right_bindC;
    xfer_needle2 = xcount2 = stitches2 = null; //new (moved)
    xfer_needle1 = right;
    side = 'right';
    xcount1 = right_dec_count + 2; //TODO: //check whether +2 for xcount is consistent
    stitches1 = right_dec_count;
  } else {
    if (right === null) {
      bindoff_carrier = left_bindC;
      xfer_needle2 = xcount2 = stitches2 = null; //new (move)
      xfer_needle1 = left;
      side = 'left';
      xcount1 = left_dec_count + 2;
      stitches1 = left_dec_count;
    } else {
      xfer_needle1 = left;
      xcount1 = left_dec_count + 2;
      stitches1 = left_dec_count;
      xfer_needle2 = right;
      xcount2 = right_dec_count + 2;
      side = 'both';
      stitches2 = right_dec_count;
    }
  }
  let side1;
  side === 'both' ? (side1 = 'left') : (side1 = side);
  if (double_bed) {
    xfer_section.push(`;dec ${stitches1} on ${side1}`);
    if (xtype === 'dec') {
      if (stitches1 === 1) {
        dec1DoubleBed(xfer_needle1, side1);
      } else if (stitches1 === 2) {
        dec2DoubleBed(xfer_needle1, side1);
      } else {
        bindoff_carrier = left_bindC;
        BINDOFF(xfer_needle1, stitches1, side1, true);
      }
      if (side === 'both') {
        xfer_section.push(`;dec ${stitches2} on right`);
        if (stitches2 === 1) {
          dec1DoubleBed(xfer_needle2, 'right');
        } else if (stitches2 === 2) {
          dec2DoubleBed(xfer_needle2, 'right');
        } else {
          bindoff_carrier = right_bindC;
          BINDOFF(xfer_needle2, stitches2, 'right', true);
        }
      }
    } else {
      console.log(chalk`{red ERR: don't have support for inc yet.}`); //FIXME: add inc support
      errors = true;
    }
  } else {
    if (xtype === 'dec') {
      if (stitches1 < 4 && stitches2 < 4) {
        xfer_section.push(`;dec ${stitches1} on ${side}`);
        let rack1 = stitches1;
        let rack2 = stitches2;
        decSingleBed(xfer_needle1, xcount1, rack1, side, xfer_needle2, xcount2, rack2);
      } else {
        xfer_section.push(`;dec ${stitches1} on ${side1}`);
        BINDOFF(xfer_needle1, stitches1, side1, false);
        if (side === 'both') {
          xfer_section.push(`;dec ${stitches2} on right`);
          BINDOFF(xfer_needle2, stitches2, 'right', false);
        }
      }
    } else {
      console.log(chalk`{red ERR: don't have support for inc yet.}`); //FIXME: add inc support
      errors = true;
    }
  }
}

//////////////////////////////////////////

////INSERT XFER PASSES
let Xleft_needle = L_NEEDLE;
let Xright_needle = R_NEEDLE;
let warning = false;
let shortrow_time = false; //new //check
let insert_arr = []; //new //check
let short_Xright_needle, short_Xleft_needle, last_shape_row;
if (shape_code_reverse !== null) {
  ////start decreasing at first row where decreases happen
  dec_row_interval = shaping_arr[0].ROW;
  if (short_row_section) last_shape_row = shaping_arr[shaping_arr.length - 1].ROW;
}
let cookie;
///////
// const shortRowCarriers = (cookie) => {
//   for (let c = 0; c < carriers.length; ++c) {
//     cookie = cookie.map((el) => {
//       if (el.charAt(el.length - 1) === carriers[c]) {
//         return el.slice(0, -1).concat(short_row_carriers[c]);
//       } else {
//         return el;
//       }
//     });
//   }
// };
////////////////////
let shaped_rows = [];
let new_carriers = []; ////for when swap carriers during shortrowing
// if (short_row_section && !sinkers) { //remove: don't need this anymore because heading is meant to have all possible carriers
//   //new //check
//   let carriers_line = caston_section.findIndex((el) => el.includes(';;Carriers:'));
//   for (let c = 0; c < carriers.length; ++c) {
//     caston_section[carriers_line] = `${caston_section[carriers_line]} ${short_row_carriers[c]}`;
//   }
// }
shaped_rows.push(caston_section);

for (let r = 0; r < dec_row_interval; ++r) {
  shaped_rows.push(rows[r]);
}
for (let r = dec_row_interval; r < rows.length; r += dec_row_interval) {
  for (let i = 0; i < rows[r - 1].length; ++i) {
    if (rows[r - 1][i].some((el) => el.includes('-'))) {
      let last_op = rows[r - 1][i][rows[r - 1][i].length - 1];
      left_bindC = last_op.charAt(last_op.length - 1);
    } else if (rows[r - 1][i].some((el) => el.includes('+'))) {
      let last_op = rows[r - 1][i][rows[r - 1][i].length - 1];
      right_bindC = last_op.charAt(last_op.length - 1);
    }
  }
  if (shape_code_reverse !== null && !warning) {
    if (!shortrow_time) {
      parseShape(shaping_arr, r);
      // if (short_row_section && r === last_shape_row) dec_row_interval = 1;
    } else {
      left_bindC = new_carriers[carriers.indexOf(left_bindC)]; //new //?
      right_bindC = new_carriers[carriers.indexOf(right_bindC)]; //new //?
      dec_row_interval = 1; //necessary//? / move down//?
      parseShape(left_shortrow_arr, r);
    }
  }
  ////////////////////////
  if (!warning && (left_dec || right_dec)) {
    let XleftN, XrightN;
    if (!left_dec) {
      XrightN = Xright_needle;
      XleftN = null;
    } else if (!right_dec) {
      XleftN = Xleft_needle;
      XrightN = null;
    } else {
      XleftN = Xleft_needle;
      XrightN = Xright_needle;
    }
    insertXferPasses(XleftN, XrightN, xtype);
    shaped_rows.push(xfer_section);
    xfer_section = [];
  }
  /////////////////// //TODO: add these warnings back in but make sure to define them / incorporate them into knitout dec functions
  // if (not_enough_needles) {
  //   if (!warning) {
  //     console.log(
  //       chalk.black.bgYellow(`! WARNING:`) +
  //         ` can't decrease by more than 1 needle on each side with less than 12 stitches on the bed because it would result in stacking too many stitches on a single needle. Will hopefully fix this issue soon, but for now, BREAK.`
  //     );
  //     Xleft_needle -= left_dec_count; ////undo this first time
  //     Xright_needle += right_dec_count; ////undo this first time
  //   }
  //   warning = true;
  // } else if (dec_count_too_big) {
  //   if (!warning) {
  //     if (double_bed) {
  //       console.log(
  //         chalk.black.bgYellow(`! WARNING:`) +
  //           ` decreasing by more than 2 needles per row for double-bed jacquard is not currently supported by this program. Will hopefully fix this issue soon, but for now, BREAK.`
  //       );
  //     } else {
  //       console.log(
  //         chalk.black.bgYellow(`! WARNING:`) +
  //           ` decreasing by more than 3 needles per row is not currently supported by this program. Will hopefully fix this issue soon, but for now, BREAK.`
  //       );
  //     }
  //     Xleft_needle -= left_dec_count; ////undo this first time
  //     Xright_needle += right_dec_count; ////undo this first time
  //   }
  //   warning = true;
  // }
  ///////////////////////////////
  if (!warning) {
    //new moved
    if (left_dec) {
      Xleft_needle += left_dec_count;
    }
    if (right_dec) {
      Xright_needle -= right_dec_count;
    }
  }
  ///////////////////////////////
  function cookieCutter(XleftN, XrightN, replacement) {
    // if (Xleft_needle !== L_NEEDLE) {
    if (XleftN !== L_NEEDLE) {
      //new //?
      for (let cc = L_NEEDLE; cc < XleftN; ++cc) {
        cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
      }
    }
    if (XrightN !== R_NEEDLE) {
      //new //?
      for (let cc = R_NEEDLE; cc > XrightN; --cc) {
        cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
      }
    }
    if (shortrow_time) {
      //new //? //come back!
      // XleftN === Xleft_needle ? (replacement = new_carriers) : (replacement = short_row_carriers);
      for (let c = 0; c < carriers.length; ++c) {
        cookie = cookie.map((el) => {
          if (el.charAt(el.length - 1) === carriers[c]) {
            return el.slice(0, -1).concat(replacement[c]);
          } else {
            return el;
          }
        });
      }
    }
  }
  if (!warning) {
    for (let i = r; i < r + dec_row_interval; ++i) {
      for (let p = 0; p < rows[i].length; ++p) {
        cookie = rows[i][p];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers);
        shaped_rows.push(cookie);
      }
    }
  } else {
    for (let w = r; w < rows.length; ++w) {
      for (let p = 0; p < rows[w].length; ++p) {
        cookie = rows[w][p];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers);
        shaped_rows.push(cookie);
      }
    }
  }
  ////
  if (shortrow_time) {
    parseShape(right_shortrow_arr, r);
    if (left_dec || right_dec) {
      let XleftN, XrightN;
      if (!left_dec) {
        XrightN = short_Xright_needle;
        XleftN = null;
      } else if (!right_dec) {
        XleftN = short_Xleft_needle;
        XrightN = null;
      } else {
        XleftN = short_Xleft_needle;
        XrightN = short_Xright_needle;
      }
      ///////
      // for (let c = 0; c < carriers.length; ++c) {
      //   if (bindoff_carrier === carriers[c]) {
      //     bindoff_carrier = short_row_carriers[c];
      //     // break; //?
      //   }
      // }
      for (let c = 0; c < carriers.length; ++c) {
        // if (left_bindC === carriers[c]) {
        if (left_bindC === new_carriers[c]) {
          //new //?
          left_bindC = short_row_carriers[c];
        }
        // if (right_bindC === carriers[c]) {
        if (right_bindC === new_carriers[c]) {
          right_bindC = short_row_carriers[c];
        }
      }
      insertXferPasses(XleftN, XrightN, xtype);
      insert_arr.push(xfer_section);
      xfer_section = []; //new
    }
    short_Xleft_needle += left_dec_count;
    short_Xright_needle -= right_dec_count;
    for (let i = r; i < r + dec_row_interval; ++i) {
      for (let p = 0; p < rows[i].length; ++p) {
        cookie = rows[i][p];
        cookieCutter(short_Xleft_needle, short_Xright_needle, short_row_carriers);
        // shortRowCarriers(cookie);
        // for (let c = 0; c < carriers.length; ++c) { //go back! //?
        //   cookie = cookie.map((el) => {
        //     if (el.charAt(el.length - 1) === carriers[c]) {
        //       return el.slice(0, -1).concat(short_row_carriers[c]);
        //     } else {
        //       return el;
        //     }
        //   });
        // }
        insert_arr.push(cookie);
      }
    }
    if ((r - first_short_row) % 2 !== 0) {
      insert_arr = insert_arr.flat();
      shaped_rows.push(insert_arr);
      insert_arr = [];
    }
  }
  ////
  if (shape_code_reverse !== null) {
    if (r === last_shape_row && !short_row_section) {
      //go back! //?
      if (!warning) {
        console.log(
          chalk.black.bgYellow(`! WARNING:`) +
            ` The program has finished running through all rows in the custom shape. The rest of the file will maintain the shape's final width.` //TODO: alter this once have function to chop off excess rows
        );
      }
      warning = true;
    }
    if (r < last_shape_row && r >= shaping_arr[shaping_arr.length - 2].ROW && short_row_section) {
      shortrow_time = true;
      for (let i = r + dec_row_interval; i < first_short_row - 1; ++i) {
        for (let p = 0; p < rows[i].length; ++p) {
          cookie = rows[i][p]; //?
          cookieCutter(Xleft_needle, Xright_needle, carriers);
          shaped_rows.push(cookie);
        }
      }
      let bindoff_pass;
      for (let p = 0; p < rows[first_short_row - 1].length; ++p) {
        if (rows[first_short_row - 1][p].some((el) => el.includes(`-`))) {
          bindoff_pass = p; ////keeps redefining until end, so ends up being final match
        }
      }
      shaped_rows.push(`;short row section`);
      for (let p = 0; p < bindoff_pass; ++p) {
        cookie = rows[first_short_row - 1][p]; //?
        cookieCutter(Xleft_needle, Xright_needle, carriers);
        shaped_rows.push(cookie);
      }
      //////
      short_Xleft_needle = shortrow_bindoff[1];
      short_Xright_needle = Xright_needle;
      Xright_needle = shortrow_bindoff[0];
      /////
      cookie = rows[first_short_row - 1][bindoff_pass];
      cookieCutter(short_Xleft_needle, short_Xright_needle, carriers); //? shortrow_bindoff[1] + 1?
      shaped_rows.push(cookie);
      bindoff_carrier = cookie[cookie.length - 1].charAt(cookie[cookie.length - 1].length - 1);
      // right_bindC = cookie[cookie.length - 1].charAt(cookie[cookie.length - 1].length - 1);
      BINDOFF(short_Xleft_needle - 1, short_Xleft_needle - Xright_needle - 1, 'right', double_bed);
      shaped_rows.push(xfer_section);
      xfer_section = [];
      cookie = rows[first_short_row - 1][bindoff_pass];
      cookieCutter(Xleft_needle, Xright_needle, carriers); //shortrow_bindoff[0] - 1?
      shaped_rows.push(cookie);
      ////////
      let left_carriers = [];
      let right_carriers = [];
      // for (let i = 0; i < rows[first_short_row - 1].length; ++i) {
      let adjustment;
      rows[first_short_row - 1][rows[first_short_row - 1].length - 1] !== bindoff_pass ? (adjustment = -1) : (adjustment = 0);
      for (let i = 0; i < rows[first_short_row - 1].length + adjustment; ++i) {
        if (rows[first_short_row - 1][i].some((el) => el.includes('-'))) {
          let last_op = rows[first_short_row - 1][i][rows[first_short_row - 1][i].length - 1];
          left_carriers.push(last_op.charAt(last_op.length - 1));
        } else if (rows[first_short_row - 1][i].some((el) => el.includes('+'))) {
          let last_op = rows[first_short_row - 1][i][rows[first_short_row - 1][i].length - 1];
          right_carriers.push(last_op.charAt(last_op.length - 1));
        }
      }
      left_carriers = [...new Set(left_carriers)]; //.sort((a, b) => a - b);
      right_carriers = [...new Set(right_carriers)]; //.sort((a, b) => a - b);
      let idxs = [];
      right_carriers.map((el) => idxs.push(carriers.indexOf(el)));
      new_carriers = carriers.map((c) => {
        if (idxs.includes(carriers.indexOf(c))) {
          return (c = short_row_carriers[carriers.indexOf(c)]);
        } else {
          return c;
        }
      });
      short_row_carriers = short_row_carriers.map((c) => {
        if (idxs.includes(short_row_carriers.indexOf(c))) {
          return (c = carriers[short_row_carriers.indexOf(c)]);
        } else {
          return c;
        }
      });
      ///////
      if (rows[first_short_row - 1][rows[first_short_row - 1].length - 1] !== bindoff_pass) {
        //new
        cookie = rows[first_short_row - 1][rows[first_short_row - 1].length - 1];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers); //shortrow_bindoff[0] - 1? //TODO: //check make sure this isn't messed up by new func in cookieCutter ////doing carriers not new_carriers for now to prevent this but.... should check
        shaped_rows.push(cookie);
        cookie = rows[first_short_row - 1][rows[first_short_row - 1].length - 1];
        cookieCutter(short_Xleft_needle, short_Xright_needle, short_row_carriers); //? shortrow_bindoff[1] + 1?
        // for (let c = 0; c < carriers.length; ++c) { //go back! //?
        //   cookie = cookie.map((el) => {
        //     if (el.charAt(el.length - 1) === carriers[c]) {
        //       return el.slice(0, -1).concat(short_row_carriers[c]);
        //     } else {
        //       return el;
        //     }
        //   });
        // }
        insert_arr.push(cookie);
      }
      dec_row_interval = first_short_row - r; //check this! //-1 //?
      // }
    }
  }
  //////////////
  // if (!warning) {
  //   if (left_dec) {
  //     Xleft_needle += left_dec_count;
  //   }
  //   if (right_dec) {
  //     Xright_needle -= right_dec_count;
  //   }
  // }
  //////////////////////////
  // if (rows[r + dec_row_interval + dec_row_interval] === undefined) {
  //?
  if (rows[r + dec_row_interval] === undefined) {
    if (shape_code_reverse === null) {
      break;
    } else {
      if (r !== shaping_arr[shaping_arr.length - 1].ROW) {
        break;
      }
    }
    //FIXME:
    // if (rows[r + dec_row_interval] === undefined || reached_bindoff) {
    //?
    // break;
  }
}

//--------------------------------
//***FINALLY, STRINGIFY FINAL_FILE
//--------------------------------
shaped_rows = shaped_rows.flat(); //TODO: determine necessary depth of flat
let final_file = JSON.stringify(shaped_rows).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
final_file = final_file.join('\n'); //new

//-------------------------------------------
//***CHECK FOR ERRORS BEFORE WRITING THE FILE
//-------------------------------------------

if (!errors && !shape_error) {
  console.log(
    // chalk`{green \nno errors found :-) don't forget to change the new file name to 'command.kc' before uploading it to the machine!}\n{black.bgYellow ! WARNING:} {italic IT IS RECOMMENDED THAT YOU EMAIL THIS FILE TO:} {bold support@kniterate.com} {italic BEFORE USE TO ENSURE THAT NO DAMAGE WILL BE CAUSED TO YOUR MACHINE.\n***contact:} {bold info@edgygrandma.com} {italic if you have any questions about this program.}`
    chalk`{green \nno errors found :-)}\n{black.bgYellow ! WARNING:} {bold IT IS RECOMMENDED THAT YOU VIEW THE NEW FILE ON THE KNITOUT LIVE VISUALIZER} {italic (https://github.com/textiles-lab/knitout-live-visualizer)} {bold BEFORE USE TO ENSURE THAT IT WILL PRODUCE A KNIT TO YOUR LIKING.\n***contact:} {italic info@edgygrandma.com} {bold if you have any questions about this program.}`
  );
}

//--------------------------
//***WRITE THE FINAL FILE !
//--------------------------
if (!errors && !shape_error) {
  fs.writeFile(`./knit-out-files/${new_file}`, final_file, function (err) {
    if (err) return console.log(err);
    console.log(chalk.green(`\nThe knitout file has successfully been altered and saved. The path to the new file is: ${new_file}`));
  });
} else {
  if (shape_error) {
    console.log(
      chalk.red(
        `ShapeError: no overlapping stitches between row #${shape_err_row + 1} and row #${
          shape_err_row + 2
        }.\nCheck working directory for 'shape_code.png' to see visualization of first error in image. (Error pixels are red)\n`
      )
    );
  } else {
    console.log(chalk.red.bgWhite.bold(`\nErrors found--unable to write file. Please refer to console log for details.`));
  }
}

//ERROR BRAINSTORM: check for things like undefined/null

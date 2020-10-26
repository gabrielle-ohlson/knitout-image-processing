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
console.log(`SHAPE_CODE:\n${shape_code_reverse}`); //remove
console.log(`SHORT_ROW:\n${shortrow_code}`); //remove
console.log(`SHORTING ROWING IS: ${short_row_section}`); //remove

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
let piece_shortrow_codeL; //new
let piece_shortrow_codeR; //new
let pieces_arr;
if (shape_code === null) {
  Template = require('./shape-templates');
  piece_code1 = Object.values(Template.piece_obj1);
  piece_shortrow_codeL = Object.values(Template.piece_shortrow_objL);
  piece_shortrow_codeR = Object.values(Template.piece_shortrow_objR);
  pieces_arr = Object.values(Template.pieces_arr);
  shape_code_reverse = [...piece_code1]; //new
  shortrow_code = [...piece_shortrow_codeL]; //new
  first_short_row = shape_code_reverse.length;
  last_short_row = first_short_row + shortrow_code.length - 1;
  short_row_section = true;
}
//-------------------------
let shortrow_sides = [];
let shortrow_bindoff = [];
function shortRowSides(code) {
  shortrow_sides = []; //new
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
  console.log(`shortrow_sides = \n${shortrow_sides}`); //remove
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
        // shape_knit = false;
      }
      if (curr_row[right] !== prev_row[right]) {
        //1, but now right
        curr_row[right] < prev_row[right] ? (shape_right_dec = curr_row[right] - prev_row[right]) : (shape_right_inc = curr_row[right] - prev_row[right]);
        // shape_knit = false;
      }
    } else {
      if (curr_row[left] !== main_left && main_left !== null) {
        //0, but now left
        curr_row[left] > main_left ? (shape_left_dec = main_left - curr_row[left]) : (shape_left_inc = main_left - curr_row[left]);
        // shape_knit = false;
      }
      if (curr_row[right] !== main_right && main_right !== null) {
        //1, but now right
        curr_row[right] < main_right ? (shape_right_dec = curr_row[right] - main_right) : (shape_right_inc = curr_row[right] - main_right);
        // shape_knit = false;
      }
    }
    let shaping = SHAPING({
      ROW: shape_code_reverse.length + r,
      LEFT: shape_left_dec + shape_left_inc, //if >0 (pos), then it's an inc. if <0 (neg). then it's a dec.
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
    let left_px1 = code[i].indexOf(1); //first black px //testing here
    let right_px1 = code[i].lastIndexOf(1); //last black px
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
    //TODO: make sure this is in the right direction
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
  prev_right,
  R_left_px1,
  R_right_px1
) {
  if (R_left_px1 !== undefined) {
    left_px1 = R_left_px1;
    right_px1 = R_right_px1;
    shape_left_dec = 0; //check on these
    shape_left_inc = 0;
    shape_right_dec = 0;
    shape_right_inc = 0;
  }
  if (i > 0 && left_px1 !== prev_left) {
    if (left_px1 > prev_left) {
      shape_left_dec = prev_left - left_px1;
    } else {
      shape_left_inc = prev_left - left_px1;
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
console.log(shaping_arr); //remove
console.log(left_shortrow_arr); //remove
console.log(right_shortrow_arr); //remove
console.log(shortrow_bindoff); //remove
console.log(`first short row: ${first_short_row}`); //remove
console.log(`last short row: ${last_short_row}`); //remove
console.log(shaping_arr[shaping_arr.length - 1].ROW); //remove
//TODO: //come back! look over this from test-kcode.js (clean it up tho)

//-------------------------------------------------------------
//***GET USER INPUT (IN FILE & SAVE AS) AND WRITE FILE TO ARRAY
//-------------------------------------------------------------
//TODO: limit it to creating new files or just editing ones produced by image processing program (and remove option of pulling from 'knit-in-files' folder)
let source_file, source_dir;
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
// readlineSync.setDefaultOptions({ prompt: '' });

readlineSync.setDefaultOptions({ prompt: chalk.blue.bold('\nSave as: ') });
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
// if (new_file.includes('.')) new_file = new_file.slice(0, new_file.indexOf('.'));

let in_file = fs
  .readFileSync(source_dir + source_file)
  .toString()
  .split(';r');
for (let i = 0; i < in_file.length; ++i) {
  in_file[i] = in_file[i].split('\n');
  in_file[i] = in_file[i].filter((el) => !el.includes('ow:'));
}
let caston_section = in_file.shift();
console.log(caston_section); //remove
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
// console.log(`true`); //remove
// if (in_file.some((element) => element.includes('+') || element.includes('-'))) {
//   console.log(`true`); //remove
//   carriers.push(in_file[in_file.length - 1]);
// }
console.log(carriers); //remove
carriers = [...new Set(carriers)];
console.log(carriers); //remove
carriers = carriers.sort((a, b) => a - b);
console.log(carriers); //remove
//--------------------------------------------------------
//***GET USER INPUT (PREFERNCES/MACHINE SPECS/SWATCH INFO)
//--------------------------------------------------------
let bindoff_carrier;
let carrier_opts = Array.from(carriers),
  bindoff_c = readlineSync.keyInSelect(carrier_opts, chalk.blue.bold(`\nWhich carrier would you like to use for bind-offs?`));
console.log(chalk.green(`-- Binding off with carrier ${carrier_opts[bindoff_c]}`));
bindoff_carrier = carrier_opts[bindoff_c];

let sinkers = readlineSync.keyInYNStrict(
  chalk`{blue.bold \nDoes the machine you are using have sinkers?} {blue.italic (If you are using a kniterate machine, the answer is no [enter 'n']. Otherwise, the answer is likely yes [enter 'y'], but you should double-check to ensure no damage is done to your machine during short-rowing.)}`
);

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
const R_NEEDLE = Math.max(...needle_count_arr);
const L_NEEDLE = Math.min(...needle_count_arr);

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
  // xfer_section = [];
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
  // xfer_section = [];
  // if (side === 'left' || side === 'both') {
  if (side === 'left') {
    xfer_section.push(`rack 1`);
    LEFT_XFER(xfer_section, dec_needle - 1, 3, 'f', 1, true); ////-1 so const function (with rack param adjustment) still works
    xfer_section.push(`rack 2`);
    LEFT_XFER(xfer_section, dec_needle - 1, 2, 'b', 2, false);
  }
  // if (side !== 'left') {
  // let dec_needle;
  // side === 'right' ? (dec_needle = dec_needle1) : (dec_needle = dec_needle2);
  if (side === 'right') {
    xfer_section.push(`rack -1`);
    RIGHT_XFER(xfer_section, dec_needle + 1, 3, 'f', -1, true);
    xfer_section.push(`rack -2`);
    RIGHT_XFER(xfer_section, dec_needle + 1, 2, 'b', -2, false);
  }
  xfer_section.push(`rack 0`);
};

const dec2DoubleBed = (dec_needle, side) => {
  // xfer_section = [];
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
const BINDOFF = (xfer_needle, count, side, double_bed) => {
  // let dir1, dir2;
  // side === 'left' ? ((dir1 = '+'), (dir2 = '-')) : ((dir1 = '-'), (dir2 = '+'));
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
        xfer_section.push(`knit + b${x} f${x}`);
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
        xfer_section.push(`xfer f${x} b${x + 1}`);
        xfer_section.push(`rack 0`);
        xfer_section.push(`knit - b${x} f${x}`);
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
      if (element.LEFT === 0) {
        left_dec_count = 0; //NEW
        right_dec_count = -element.RIGHT; //NEW
        // dec_count_num = -element.RIGHT; //TODO: change dec_count_num to be for dec and inc or add separate variables / functions for increases
        right_dec = true;
        left_dec = false;
      } else if (element.RIGHT === 0) {
        left_dec_count = -element.LEFT; //NEW
        right_dec_count = 0; //NEW
        // dec_count_num = -element.LEFT; ////added neg to make pos
        left_dec = true;
        right_dec = false;
      } else {
        // if (element.LEFT === element.RIGHT) {
        left_dec_count = -element.LEFT; //NEW
        right_dec_count = -element.RIGHT; //NEW
        // dec_count_num = -element.LEFT;
        left_dec = true;
        right_dec = true;
        // } else {
        //   console.log(
        //     chalk`{red.bold \nERR:} {red AT ROW ${r}: custom shape decreases ${element.LEFT} needles on left side and ${element.RIGHT} needle on right side. Currently, this program does not support unequal decreasing on both sides in one row. Will hopefully fix this issue soon, but for now, please alter the shape.}`
        //   );
        //   errors = true;
        // }
        //TODO: add support for decreasing unequally on both sides in one row
      }
      if (arr.indexOf(element) < arr.length - 1) {
        let next_element = arr.indexOf(element) + 1;
        dec_row_interval = arr[next_element].ROW - element.ROW;
        // console.log(element);
      } else {
        dec_row_interval = 1;
      }
    }
  });
}

////dec 1 ? count = 3 & rack = 1; dec2 ? count = 4 & rack = 2;
function insertXferPasses(left, right, xtype) {
  let xfer_needle1, xcount1, xfer_needle2, xcount2, side, stitches1, stitches2;
  // xfer_needle2 = xcount2 = stitches2 = null;
  if (left === null) {
    xfer_needle2 = xcount2 = stitches2 = null; //new (moved)
    xfer_needle1 = right;
    side = 'right';
    xcount1 = right_dec_count + 2; //TODO: //check whether +2 for xcount is consistent
    stitches1 = right_dec_count;
  } else {
    if (right === null) {
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
  // left === null
  //   ? ((xfer_needle1 = right), (side = 'right'), (xcount1 = right_dec_count + 2), (xcount2 = null))
  //   : right === null
  //   ? ((xfer_needle = left), (side = 'left'), (xcount1 = left_dec_count + 2), (xcount2 = null))
  //   : ((xfer_needle = left), (xcount1 = left_dec_count + 2), (xfer_needle2 = right), (xcount2 = right_dec_count + 2), (side = 'both'));
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
        BINDOFF(xfer_needle1, stitches1, side1, true);
      }
      if (side === 'both') {
        xfer_section.push(`;dec ${stitches2} on right`);
        if (stitches2 === 1) {
          dec1DoubleBed(xfer_needle2, 'right');
        } else if (stitches2 === 2) {
          dec2DoubleBed(xfer_needle2, 'right');
        } else {
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
        // rows[row].splice(xfer_section);
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
let short_Xright_needle;
let short_Xleft_needle;
if (shape_code_reverse !== null) {
  //start decreasing at first row where decreases happen
  dec_row_interval = shaping_arr[0].ROW;
}
let cookie;
////////////////////
let shaped_rows = [];
shaped_rows.push(caston_section);

for (let r = 0; r < dec_row_interval; ++r) {
  shaped_rows.push(rows[r]);
}
for (let r = dec_row_interval; r < rows.length; r += dec_row_interval) {
  if (shape_code_reverse !== null && !warning) {
    if (!shortrow_time) {
      //check //?
      parseShape(shaping_arr, r);
    } else {
      dec_row_interval = 1;
      if (r === first_short_row) {
        short_Xleft_needle = shortrow_bindoff[0];
        short_Xright_needle = Xright_needle;
        Xright_needle = shortrow_bindoff[1];
      }
      parseShape(left_shortrow_arr, r);
    }
    // && !warning ?? TODO: determine this //go back! //?
  }
  ////////////////////////
  // if (!warning) { //?
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
    // insertXferPasses(Xleft_needle, Xright_needle, xtype);
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
  function cookieCutter() {
    // if (left_dec) { //go back! //?
    // if (left_dec && Xleft_needle !== L_NEEDLE) {
    if (Xleft_needle !== L_NEEDLE) {
      //new //?
      for (let cc = L_NEEDLE; cc < Xleft_needle; ++cc) {
        // console.log(`cookie = ${cookie}`); //remove
        // console.log(cookie[0]); //remove
        // console.log(`f${cc} `); //remove
        cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
        // console.log(`now! cookie = ${cookie}`); //remove
      }
    }
    // if (right_dec) { //go back! //?
    // if (right_dec && Xright_needle !== R_NEEDLE) {
    if (Xright_needle !== R_NEEDLE) {
      //new //?
      for (let cc = R_NEEDLE; cc > Xright_needle; --cc) {
        cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
        // cookie = cookie.filter((el) => {
        // !el.includes(`f${cc} `);
        // !el.includes(`b${cc} `);
        // });
      }
    }
  }
  if (!warning) {
    for (let i = r; i < r + dec_row_interval; ++i) {
      for (let p = 0; p < rows[i].length; ++p) {
        cookie = rows[i][p];
        cookieCutter();
        shaped_rows.push(cookie);
      }
    }
  } else {
    // left_dec = right_dec = true; //check this ... doing this so it chops of edges on both sides, according to most recent dec(could be 0 on one side )
    for (let w = r; w < rows.length; ++w) {
      for (let p = 0; p < rows[w].length; ++p) {
        cookie = rows[w][p];
        cookieCutter();
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
        XleftN = Xleft_needle;
        XrightN = Xright_needle;
      }
      insertXferPasses(XleftN, XrightN, xtype);
      // insertXferPasses(short_Xleft_needle, short_Xright_needle, xtype);
      insert_arr.push(xfer_section);
    }
    // if (shortrow_count % 2 !== 0) { //TODO: //FIXME: //come back! figure out what to do here
    //   let x = 0;
    //   if (shortrow_count === 0) {
    //     x += 1;
    //   }
    //   for (let i = r; i < r + dec_row_interval + x; ++i) {
    //     for (let p = 0; p < rows[i].length; ++p) {
    //       cookie = rows[i][p].split(','); //?
    //       cookieCutter(); //TODO: shortrowR_pass num ???
    //       insert_arr.push(cookie);
    //     }
    //   }
    // } else {
    for (let i = r; i < r + dec_row_interval; ++i) {
      for (let p = 0; p < rows[i].length; ++p) {
        cookie = rows[i][p];
        cookieCutter();
        insert_arr.push(cookie);
      }
      shaped_rows.push(insert_arr);
      insert_arr = [];
      short_Xleft_needle += left_dec_count;
      short_Xright_needle -= right_dec_count;
    }
  }
  ////
  if (shape_code_reverse !== null) {
    //FIXME:
    if (r === shaping_arr[shaping_arr.length - 1].ROW) {
      //go back! //?
      if (!short_row_section) {
        //new //? bc needs to be length of ARRAY
        if (!warning) {
          console.log(
            chalk.black.bgYellow(`! WARNING:`) +
              ` The program has finished running through all rows in the custom shape. The rest of the file will maintain the shape's final width.` //TODO: alter this once have function to chop off excess rows
          );
        }
        warning = true;
      } else {
        shortrow_time = true;
        console.log(`shortrow_time!!!`); //remove fs
        dec_row_interval = first_short_row - r; //check this! //-1 //?
        // left_dec = right_dec = true; //check this ... doing this so it chops of edges on both sides, according to most recent dec(could be 0 on one side )
        for (let i = r; i < first_short_row; ++i) {
          for (let p = 0; p < rows[i].length; ++p) {
            /////
            cookie = rows[i][p]; //?
            cookieCutter();
            insert_arr.push(cookie);
          }
        }
      }
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
    // if (rows[r + dec_row_interval] === undefined || reached_bindoff) {
    //?
    break;
  }
}

//-------------------------------------------
//***FINALLY, STRINGIFY FINAL_FILE
//-------------------------------------------
shaped_rows = shaped_rows.flat(); //TODO: determine necessary depth of flat
let final_file = JSON.stringify(shaped_rows).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
final_file = final_file.join('\n'); //new

//-------------------------------------------
//***CHECK FOR ERRORS BEFORE WRITING THE FILE
//-------------------------------------------

if (!errors && !shape_error) {
  console.log(
    chalk`{green \nno errors found :-) don't forget to change the new file name to 'command.kc' before uploading it to the machine!}\n{black.bgYellow ! WARNING:} {italic IT IS RECOMMENDED THAT YOU EMAIL THIS FILE TO:} {bold support@kniterate.com} {italic BEFORE USE TO ENSURE THAT NO DAMAGE WILL BE CAUSED TO YOUR MACHINE.\n***contact:} {bold info@edgygrandma.com} {italic if you have any questions about this program.}`
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
  // fs.writeFile(`./out_kc_files/${new_file}`, final_file, function (err) {
  //   //remove //come
  //   if (err) return console.log(err);
  //   console.log(chalk.green(`\nThe k-code has successfully been altered and saved. The path to the new file is: ${new_file}`));
  // });
}

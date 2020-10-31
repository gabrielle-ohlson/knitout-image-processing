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
        curr_row[left] > prev_row[left] ? (shape_left_dec = prev_row[left] - curr_row[left]) : (shape_left_inc = prev_row[left] - curr_row[left]);
      }
      if (curr_row[right] !== prev_row[right]) {
        curr_row[right] < prev_row[right] ? (shape_right_dec = curr_row[right] - prev_row[right]) : (shape_right_inc = curr_row[right] - prev_row[right]);
      }
    } else {
      if (curr_row[left] !== main_left && main_left !== null) {
        curr_row[left] > main_left ? (shape_left_dec = main_left - curr_row[left]) : (shape_left_inc = main_left - curr_row[left]);
      }
      if (curr_row[right] !== main_right && main_right !== null) {
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
let row1_small = false;
const L_NEEDLE = 1;
const R_NEEDLE = shape_code_reverse[0].length;
let row1_Lneedle = L_NEEDLE;
let row1_Rneedle = R_NEEDLE;
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
    ////
    if (i === 0) {
      //new //// for when there are increases: check to see if the shape starts out smaller than max width
      if (left_px1 !== 0) {
        row1_small = true;
        row1_Lneedle = left_px1 + 1;
      }
      if (right_px1 !== code.length - 1) {
        row1_small = true;
        row1_Rneedle = right_px1 + 1;
      }
    }
    ///
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
function shapingDetection(i, left_px1, shape_left_dec, shape_left_inc, shape_knit, right_px1, shape_right_dec, shape_right_inc, prev_left, prev_right) {
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
if (short_row_section) {
  //new
  caston_section = caston_section.filter((el) => !el.includes('out ')); //new// remove yarn-outs so can add them back in @ correct positions
}

let bg_color = caston_section.find((line) => line.includes(`;background color:`)); ////method to do fake seam carving (use background needles only when xfering in middle of panel)
bg_color = bg_color.charAt(bg_color.length - 1);

let draw_thread = caston_section.find((line) => line.includes(`;draw thread:`)); ////for shortrowcarriers, know that first one ends up on the right (because draw thread) and rest are on left
draw_thread = draw_thread.charAt(draw_thread.length - 1);
console.log(`draw thread: ${draw_thread}`); //new

let bindoff_section = in_file[in_file.length - 1].splice(in_file[in_file.length - 1].indexOf(`;bindoff section`));

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
let sinkers = readlineSync.keyInYNStrict(
  chalk`{blue.bold \nDoes the machine you are using have sinkers?} {blue.italic (If you are using a kniterate machine, the answer is no [enter 'n']. Otherwise, the answer is likely yes [enter 'y'], but you should double-check to ensure no damage is done to your machine during short-rowing.)}`
);

//-------------------------------------------------------------------------------------------------------
//***FOR KNITERATE: CREATE ARRAY OF CARRIERS AVAILABLE TO USE FOR SHORT ROWING, & THROW ERR IF NOT ENOUGH
//-------------------------------------------------------------------------------------------------------
let short_row_carriers = ['1', '2', '3', '4', '5', '6'];

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
let xtra_carriers = [];
if (short_row_section) xtra_carriers = short_row_carriers.filter((el) => !carriers.includes(el) && el !== draw_thread); //new with draw thread

console.log(xtra_carriers); //new //remove

if (short_row_carriers.length < 3 && short_row_section && !sinkers) {
  console.log(
    chalk`{red.bold \nERR:} {red the section of the panel that will be altered to include short-rowing contains ${short_row_carriers.length} colors, but the maximum color-count for that section is 3 (to allow for separate carriers to work either side while short-rowing).}`
  );
  errors = true;
}

//-------------------------------------------------------------------------------------
//***SHIFT CAST-ON SECTION OVER IF NECESSARY/ADD IN SHORTROW YARN CARRIERS IF NECESSARY
//-------------------------------------------------------------------------------------
//TODO: add this for shima caston
let header = [];
let yarns_in = [];
if ((row1_small || xtra_carriers.length > 0) && caston_section[1].includes(`kniterate`)) {
  header = caston_section;
  yarns_in = header.splice(header.findIndex((el) => el.includes(`;background color:`)) + 1);
  caston_section = yarns_in.splice(yarns_in.findIndex((el) => el.includes(`;kniterate yarns in`)));
  let left_diff = row1_Lneedle - L_NEEDLE;
  let kniterate_caston = [];
  kniterate_caston.push(header);
  yarnsin: for (let i = 0; i < yarns_in.length; ++i) {
    let line = yarns_in[i].split(' ');
    if (line[0] === 'knit' || line[0] === 'drop') {
      let n;
      line[0] === 'knit' ? (n = 2) : (n = 1);
      [bed, line[n]] = [line[n][0], line[n].substr(1)];
      let n_count = Number(line[n]) + left_diff;
      line[n] = `${bed}${n_count}`;
      if (n_count <= row1_Rneedle) {
        kniterate_caston.push(line.join(' '));
      } else {
        continue yarnsin;
      }
    } else {
      kniterate_caston.push(yarns_in[i]);
    }
  }
  if (xtra_carriers.length > 0) {
    let base = [...kniterate_caston];
    base.reverse();
    base.splice(base.findIndex((el) => el.includes('in ')));
    base.reverse();
    for (let i = 0; i < xtra_carriers.length; ++i) {
      let xcarrier = xtra_carriers[i];
      let xtra_rows = base.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${xcarrier}`));
      kniterate_caston.push(`in ${xcarrier}`, xtra_rows);
    }
  }
  caston: for (let i = 0; i < caston_section.length; ++i) {
    let line = caston_section[i].split(' ');
    if (line[0] === 'knit' || line[0] === 'drop') {
      let n;
      line[0] === 'knit' ? (n = 2) : (n = 1);
      [bed, line[n]] = [line[n][0], line[n].substr(1)];
      let n_count = Number(line[n]) + left_diff;
      line[n] = `${bed}${n_count}`;
      if (n_count <= row1_Rneedle) {
        kniterate_caston.push(line.join(' '));
      } else {
        continue caston;
      }
    } else {
      kniterate_caston.push(caston_section[i]);
    }
  }
  // }
  caston_section = kniterate_caston.flat();
}

let final_carrier_pos = [];
const CARRIER_PARK = ({ CARRIER, SIDE, ROW, IDX }) => ({
  CARRIER,
  SIDE,
  ROW,
  IDX,
});
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
  pass_loop: for (let p = 0; p < in_file[i].length; ++p) {
    let op_arr = in_file[i][p].split(' ');
    let type = op_arr[0];
    let dir, needle, carrier;
    if (type.includes(';')) {
      continue pass_loop;
      // type = 'comment';
      // dir = needle = carrier = null;
    }
    if (type.includes('hook') || type.includes('out')) {
      //TODO: maybe use this to do the inhook + releasehook for shima... maybe just to preserve it (push it to pass but make sure it doesn't throw off pass check)
      //new
      op_arr.length > 2 ? (carrier = op_arr.slice(1)) : (carrier = op_arr[1]);
      let side;
      pass_check[pass_check.length - 1].DIR === '+' ? (side = 'right') : (side = 'left');
      final_carrier_pos.push(
        CARRIER_PARK({
          CARRIER: carrier,
          SIDE: side,
          ROW: rows.length,
          IDX: row.length,
        })
      );
      dir = needle = null; //remove //?
      continue pass_loop;
    }
    if (type !== 'xfer') {
      op_arr[1] === '+' || '-'
        ? ((dir = op_arr[1]), (needle = op_arr[2]), op_arr.length < 4 ? (carrier = null) : (carrier = op_arr[3]))
        : ((dir = null), (needle = op_arr[1]), (carrier = null));
    }
    // if (type === 'comment') TODO: maybe push comments
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
//***DETERMINE IF SINGLE OR DOUBLE BED //; IDENTIFY THE LEFT & RIGHT MOST NEEDLES
//----------------------------------------------------------------------------
let needle_count_arr = rows.flat(2);
let double_bed;
needle_count_arr.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false); //check

needle_count_arr = needle_count_arr.map((el) => el.match(/\d+/g));
needle_count_arr = needle_count_arr.map((arr) => arr.splice(0, 1));
needle_count_arr = needle_count_arr.map((el) => Number(el));

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
        xfer_section.push(`knit + b${x + 1} ${bindoff_carrier}`); //new
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
        xfer_section.push(`knit - b${x - 1} ${bindoff_carrier}`); //new
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
};

//----------------------
//***PROTO INC FUNCTIONS
//----------------------
////twice if inc both sides
let bg_needles = [];
const incSingleBed = (Xside_needle, side, bg_side) => {
  if (side === 'left') {
    for (let b = 0; b < bg_side.length; ++b) {
      let shift_count = Math.abs(Xside_needle - bg_side[b]) + 1;
      RIGHT_XFER(xfer_section, bg_side[b], shift_count, 'f', 0, false);
      xfer_section.push(`rack -1`);
      RIGHT_XFER(xfer_section, bg_side[b] + 1, shift_count, 'b', -1, false);
      --Xside_needle; //new
    }
    xfer_section.push(`rack 0`);
  } else if (side === 'right') {
    for (let b = 0; b < bg_side.length; ++b) {
      let shift_count = Math.abs(Xside_needle - bg_side[b]) + 1;
      LEFT_XFER(xfer_section, bg_side[b], shift_count, 'f', 0, false);
      xfer_section.push(`rack 1`);
      LEFT_XFER(xfer_section, bg_side[b], shift_count, 'b', 1, false);
      xfer_section.push(`rack 0`);
      ++Xside_needle; //new
    }
  }
};
function cleanInc(r) {
  return () => {
    function getRandomInt(max) {
      return Math.floor(Math.random() * Math.floor(max));
    }
    let bg_c;
    let carrier_occur = rows[r][0].map((el) => el.charAt(el.length - 1));
    carrier_occur = carrier_occur.reduce((a, b, i, arr) => (arr.filter((v) => v === a).length >= arr.filter((v) => v === b).length ? a : b), null);
    rows[r][0].some(el.charAt(el.length - 1) == bg_color ? (bg_c = bg_color) : (bg_c = carrier_occur));
    let bg_arr = rows[r][0].filter((el) => el.charAt(el.length - 1) == bg_c); // == so doesn't matter that its a number
    let bgN_arr = [];
    for (let b = 0; b < bg_arr.length; ++b) {
      let bg_op_arr = bg_arr[b].split(' ');
      bg_op_arr[2] = bg_op_arr[2].slice(1); //// remove the f or b
      bgN_arr.push(Number(bg_op_arr[2]));
    }
    let bgN_idx = [];
    for (let b = 0; b < left_xfer_count + right_xfer_count; ++b) {
      let idx = getRandomInt(bgN_arr.length);
      if (!bgN_idx.includes(idx)) {
        bgN_idx.push(idx);
        bg_needles.push(bgN_arr[idx]);
      } else {
        b -= 1;
      }
    }
  };
}

const incDoubleBed = (Xside_needle, side) => {
  xfer_section.push(`rack -2`);
  if (side === 'left') {
    xfer_section.push(`xfer b${Xside_needle + 1} f${Xside_needle - 1}`);
    bg_needles.push(`b${Xside_needle + 1}`);
    xfer_section.push(`rack 2`);
    xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle - 1}`);
    bg_needles.push(`f${Xside_needle + 1}`);
  } else if (side === 'right') {
    xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle + 1}`);
    bg_needles.push(`f${Xside_needle - 1}`);
    xfer_section.push(`rack 2`);
    xfer_section.push(`xfer b${Xside_needle - 1} f${Xside_needle + 1}`);
    bg_needles.push(`b${Xside_needle - 1}`);
  }
  xfer_section.push(`rack 0`);
};

//---------------------------
//***INSERT TRANSFER SECTIONS
//---------------------------
let left_xfer = true; ////for now
let right_xfer = true;
let xtype, left_xfer_count, right_xfer_count, xfer_row_interval;
function parseShape(arr, r) {
  arr.some((element) => {
    if (element.ROW === r) {
      if (element.LEFT > 0 || element.RIGHT > 0) {
        xtype = 'inc';
      } else {
        xtype = 'dec';
      }
      left_xfer = right_xfer = false; ////for now
      left_xfer_count = right_xfer_count = 0; ////for now
      if (element.RIGHT !== 0) {
        xtype === 'dec' ? (right_xfer_count = -element.RIGHT) : (right_xfer_count = element.RIGHT);
        right_xfer = true;
      }
      if (element.LEFT !== 0) {
        xtype === 'dec' ? (left_xfer_count = -element.LEFT) : (left_xfer_count = element.LEFT);
        left_xfer = true;
      }
      if (arr.indexOf(element) < arr.length - 1) {
        let next_element = arr.indexOf(element) + 1;
        xfer_row_interval = arr[next_element].ROW - element.ROW;
      } else {
        xfer_row_interval = 1;
      }
    }
  });
}

let left_bindC, right_bindC;
function insertXferPasses(left, right, xtype) {
  let xfer_needle1, xcount1, xfer_needle2, xcount2, side, stitches1, stitches2;
  let bg_arr1 = [...bg_needles]; //check if this becomes a problem for double bed inc
  let bg_arr2 = [...bg_needles];
  if (left === null) {
    xfer_needle2 = xcount2 = stitches2 = null;
    xfer_needle1 = right;
    side = 'right';
    xcount1 = right_xfer_count + 2; //TODO: //check whether +2 for xcount is consistent when more than 2/3
    stitches1 = right_xfer_count;
  } else {
    if (right === null) {
      xfer_needle2 = xcount2 = stitches2 = null;
      xfer_needle1 = left;
      side = 'left';
      xcount1 = left_xfer_count + 2;
      stitches1 = left_xfer_count;
    } else {
      xfer_needle1 = left;
      xcount1 = left_xfer_count + 2;
      stitches1 = left_xfer_count;
      xfer_needle2 = right;
      xcount2 = right_xfer_count + 2;
      side = 'both';
      stitches2 = right_xfer_count;
      if (!double_bed) {
        for (let b = 0; b < right_xfer_count; ++b) {
          bg_arr1.pop();
        }
        for (let b = 0; b < left_xfer_count; ++b) {
          bg_arr2.shift();
        }
      }
    }
  }
  let side1;
  side === 'both' ? (side1 = 'left') : (side1 = side);
  if (double_bed) {
    if (xtype === 'dec') {
      xfer_section.push(`;dec ${stitches1} on ${side1}`);
      if (stitches1 === 1) {
        dec1DoubleBed(xfer_needle1, side1);
      } else if (stitches1 === 2) {
        dec2DoubleBed(xfer_needle1, side1);
      } else {
        side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC); //new
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
      xfer_section.push(`;inc ${stitches1} on ${side1}`);
      incDoubleBed(xfer_needle1, side1);
      if (side === 'both') {
        xfer_section.push(`;inc ${stitches2} on right`);
        incDoubleBed(xfer_needle2, 'right');
      }
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
        side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC);
        BINDOFF(xfer_needle1, stitches1, side1, false);
        if (side === 'both') {
          xfer_section.push(`;dec ${stitches2} on right`);
          bindoff_carrier = right_bindC; //new
          BINDOFF(xfer_needle2, stitches2, 'right', false);
        }
      }
    } else {
      xfer_section.push(`;inc ${stitches1} on ${side1}`);
      incSingleBed(xfer_needle1, side1, bg_arr1);
      if (side === 'both') {
        xfer_section.push(`;inc ${stitches2} on right`);
        incSingleBed(xfer_needle2, 'right', bg_arr2);
      }
    }
  }
}

//////////////////////////////////////////

////INSERT XFER PASSES
let Xleft_needle = L_NEEDLE;
let Xright_needle = R_NEEDLE;
let warning = false;
let shortrow_time = false;
let insert_arr = [];
let short_Xright_needle, short_Xleft_needle, last_shape_row;
if (shape_code_reverse !== null) {
  ////start decreasing at first row where decreases happen
  xfer_row_interval = shaping_arr[0].ROW;
  if (short_row_section) last_shape_row = shaping_arr[shaping_arr.length - 1].ROW;
}
let cookie;
////////////////////
let shaped_rows = [];
let new_carriers = []; ////for when swap carriers during shortrowing (kniterate)
shaped_rows.push(caston_section);

if (!row1_small) {
  for (let r = 0; r < xfer_row_interval; ++r) {
    shaped_rows.push(rows[r]);
  }
} else {
  xfer_row_interval = 0;
  Xleft_needle = row1_Lneedle;
  Xright_needle = row1_Rneedle;
}
///////
for (let r = xfer_row_interval; r < rows.length; r += xfer_row_interval) {
  xtype = undefined; ////reset for now in case no xfers
  if (r !== 0) {
    for (let i = 0; i < rows[r - 1].length; ++i) {
      if (rows[r - 1][i].some((el) => el.includes('-'))) {
        let last_op = rows[r - 1][i][rows[r - 1][i].length - 1];
        left_bindC = last_op.charAt(last_op.length - 1);
      } else if (rows[r - 1][i].some((el) => el.includes('+'))) {
        let last_op = rows[r - 1][i][rows[r - 1][i].length - 1];
        right_bindC = last_op.charAt(last_op.length - 1);
      }
    }
  } else {
    xfer_row_interval = shaping_arr[0].ROW;
  }
  if (shape_code_reverse !== null && !warning) {
    if (!shortrow_time) {
      parseShape(shaping_arr, r);
    } else {
      left_bindC = new_carriers[carriers.indexOf(left_bindC)];
      right_bindC = new_carriers[carriers.indexOf(right_bindC)];
      xfer_row_interval = 1; //necessary//? / move down//?
      parseShape(left_shortrow_arr, r);
    }
  }
  ////////////////////////
  if (!warning && (left_xfer || right_xfer) && r !== 0) {
    let XleftN, XrightN;
    if (!left_xfer) {
      XrightN = Xright_needle;
      XleftN = null;
    } else if (!right_xfer) {
      XleftN = Xleft_needle;
      XrightN = null;
    } else {
      XleftN = Xleft_needle;
      XrightN = Xright_needle;
    }
    if (xtype === 'inc' && !double_bed) {
      //new
      cleanInc(r);
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
  //     Xleft_needle -= left_xfer_count; ////undo this first time
  //     Xright_needle += right_xfer_count; ////undo this first time
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
  //     Xleft_needle -= left_xfer_count; ////undo this first time
  //     Xright_needle += right_xfer_count; ////undo this first time
  //   }
  //   warning = true;
  // }
  ///////////////////////////////
  if (!warning && r !== 0) {
    if (left_xfer) {
      xtype === 'dec' ? (Xleft_needle += left_xfer_count) : (Xleft_needle -= left_xfer_count);
    }
    if (right_xfer) {
      xtype === 'dec' ? (Xright_needle -= right_xfer_count) : (Xright_needle += right_xfer_count);
    }
  }
  ///////////////////////////////
  function cookieCutter(XleftN, XrightN, replacement, p) {
    if (XleftN !== L_NEEDLE) {
      for (let cc = L_NEEDLE; cc < XleftN; ++cc) {
        cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
      }
    }
    if (XrightN !== R_NEEDLE) {
      for (let cc = R_NEEDLE; cc > XrightN; --cc) {
        cookie = cookie.filter((el) => !el.includes(`f${cc} `) && !el.includes(`b${cc} `));
      }
    }
    if (shortrow_time) {
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
    for (let i = r; i < r + xfer_row_interval; ++i) {
      for (let p = 0; p < rows[i].length; ++p) {
        cookie = rows[i][p];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers, p);
        if (xtype === 'inc' && p === 0) {
          for (let b = 0; b < bg_needles.length; ++b) {
            cookie = cookie.map((el) => {
              if (el.includes(`f${bg_needles[b]} `) || el.includes(`b${bg_needles[b]} `)) {
                if (el.includes('+')) {
                  return (el = el.replace('+', '-'));
                } else if (el.includes('-')) {
                  return (el = el.replace('-', '+'));
                }
              } else {
                return el;
              }
            });
          }
          bg_needles = [];
        }
        shaped_rows.push(cookie);
      }
    }
  } else {
    for (let w = r; w < rows.length; ++w) {
      for (let p = 0; p < rows[w].length; ++p) {
        cookie = rows[w][p];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers, null);
        shaped_rows.push(cookie);
      }
    }
  }
  ////
  if (shortrow_time) {
    parseShape(right_shortrow_arr, r);
    if (left_xfer || right_xfer) {
      let XleftN, XrightN;
      if (!left_xfer) {
        XrightN = short_Xright_needle;
        XleftN = null;
      } else if (!right_xfer) {
        XleftN = short_Xleft_needle;
        XrightN = null;
      } else {
        XleftN = short_Xleft_needle;
        XrightN = short_Xright_needle;
      }
      ///////
      for (let c = 0; c < carriers.length; ++c) {
        if (left_bindC === new_carriers[c]) {
          left_bindC = short_row_carriers[c];
        }
        if (right_bindC === new_carriers[c]) {
          right_bindC = short_row_carriers[c];
        }
      }
      if (xtype === 'inc' && !double_bed) {
        cleanInc(r);
      }
      insertXferPasses(XleftN, XrightN, xtype);
      insert_arr.push(xfer_section);
      xfer_section = [];
    }
    xtype === 'dec' ? (short_Xleft_needle += left_xfer_count) : (short_Xleft_needle -= left_xfer_count);
    xtype === 'dec' ? (short_Xright_needle -= right_xfer_count) : (short_Xright_needle += right_xfer_count);
    for (let i = r; i < r + xfer_row_interval; ++i) {
      for (let p = 0; p < rows[i].length; ++p) {
        cookie = rows[i][p];
        cookieCutter(short_Xleft_needle, short_Xright_needle, short_row_carriers, p);
        if (xtype === 'inc' && p === 0) {
          for (let b = 0; b < bg_needles.length; ++b) {
            cookie = cookie.map((el) => {
              if (el.includes(`f${bg_needles[b]} `) || el.includes(`b${bg_needles[b]} `)) {
                if (el.includes('+')) {
                  return (el = el.replace('+', '-'));
                } else if (el.includes('-')) {
                  return (el = el.replace('-', '+'));
                }
              } else {
                return el;
              }
            });
          }
          bg_needles = [];
        }
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
      for (let i = r + xfer_row_interval; i < first_short_row - 1; ++i) {
        for (let p = 0; p < rows[i].length; ++p) {
          cookie = rows[i][p];
          cookieCutter(Xleft_needle, Xright_needle, carriers, p);
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
        cookieCutter(Xleft_needle, Xright_needle, carriers, null);
        shaped_rows.push(cookie);
      }
      //////
      short_Xleft_needle = shortrow_bindoff[1];
      short_Xright_needle = Xright_needle;
      Xright_needle = shortrow_bindoff[0];
      /////
      cookie = rows[first_short_row - 1][bindoff_pass];
      cookieCutter(short_Xleft_needle, short_Xright_needle, carriers);
      shaped_rows.push(cookie);
      bindoff_carrier = cookie[cookie.length - 1].charAt(cookie[cookie.length - 1].length - 1);
      BINDOFF(short_Xleft_needle - 1, short_Xleft_needle - Xright_needle - 1, 'right', double_bed);
      shaped_rows.push(xfer_section);
      xfer_section = [];
      cookie = rows[first_short_row - 1][bindoff_pass];
      cookieCutter(Xleft_needle, Xright_needle, carriers);
      shaped_rows.push(cookie);
      let out_carriers = false;
      if (carriers.length > 3 && !errors) {
        out_carriers = true;
        //TODO: figure out what to do (IRL) about carriers leaving tails on side from before shortrowsection (pause machine & cut them?)
        carriers = carriers.filter((el) => !short_row_carriers.includes(el));
      }
      ///////////////////////////
      let left_carriers = [];
      let right_carriers = [];
      let left_shortCs = [];
      let right_shortCs = [];
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
      left_carriers = [...new Set(left_carriers)];
      right_carriers = [...new Set(right_carriers)];
      let idxs = [];
      right_carriers.map((el) => idxs.push(carriers.indexOf(el)));
      let left_idxs = [];
      left_carriers.map((el) => left_idxs.push(carriers.indexOf(el))); //?
      ////
      if (out_carriers) {
        for (let i = 0; i < final_carrier_pos.length; ++i) {
          if (short_row_carriers.includes(final_carrier_pos[i].CARRIER)) {
            if (final_carrier_pos[i].SIDE === 'left') {
              left_shortCs.push(final_carrier_pos[i].CARRIER);
            } else {
              right_shortCs.push(final_carrier_pos[i].CARRIER);
            }
          }
        }
        function moveCarrier(from, to) {
          let f = short_row_carriers.splice(from, 1)[0];
          short_row_carriers.splice(to, 0, f);
        }
        if (left_shortCs.length !== 0 && !left_idxs.includes(-1)) {
          for (let i = 0; i < left_shortCs.length; ++i) {
            moveCarrier(short_row_carriers.indexOf(left_shortCs[i]), left_idxs[i]);
          }
        }
        if (right_shortCs.length !== 0) {
          for (let i = 0; i < right_shortCs.length; ++i) {
            if (!idxs.includes(-1)) {
              moveCarrier(short_row_carriers.indexOf(right_shortCs[i]), idxs[i]);
            } else {
              moveCarrier(short_row_carriers.indexOf(right_shortCs[i]), 0);
            }
          }
        }
      }
      ////
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
        cookie = rows[first_short_row - 1][rows[first_short_row - 1].length - 1];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers);
        shaped_rows.push(cookie);
        cookie = rows[first_short_row - 1][rows[first_short_row - 1].length - 1];
        cookieCutter(short_Xleft_needle, short_Xright_needle, short_row_carriers);
        insert_arr.push(cookie);
      }
      xfer_row_interval = first_short_row - r;
    }
  }
  //////////////////////////
  if (rows[r + xfer_row_interval + xfer_row_interval] === undefined) {
    if (shape_code_reverse === null) {
      break;
    } else {
      if (r !== shaping_arr[shaping_arr.length - 1].ROW) {
        break;
      }
    }
  }
}

//--------------
//***ADD BINDOFF
//--------------
//TODO: add tag at end of bindoff?
shaped_rows = shaped_rows.flat();
let bindoff = [];
let bindoff_side, Bxfer_needle, bindoff_count;
last_carrier: for (let i = shaped_rows.length - 1; i > 0; --i) {
  if (shaped_rows[i].includes('knit')) {
    bindoff_carrier = shaped_rows[i].charAt(shaped_rows[i].length - 1);
    shaped_rows[i].includes('+') ? (bindoff_side = 'right') : (bindoff_side = 'left');
    break last_carrier;
  }
}
if (short_row_section && short_row_carriers.includes(bindoff_carrier)) {
  bindoff_side === 'right' ? (Bxfer_needle = short_Xright_needle) : (Bxfer_needle = short_Xleft_needle);
  bindoff_count = short_Xright_needle - short_Xleft_needle + 1;
} else {
  bindoff_side === 'right' ? (Bxfer_needle = Xright_needle) : (Bxfer_needle = Xleft_needle);
  bindoff_count = Xright_needle - Xleft_needle + 1;
}
xfer_section.push(`;bindoff section`);
BINDOFF(Bxfer_needle, bindoff_count, bindoff_side, double_bed);
bindoff.push(xfer_section);
xfer_section = [];
if (short_row_section) {
  function bindOtherSide(carrier_arr) {
    last_carrier: for (let i = shaped_rows.length - 1; i > 0; --i) {
      for (let c = 0; c < carrier_arr.length; ++c) {
        if (shaped_rows[i].includes('knit') && shaped_rows[i].charAt(shaped_rows[i].length - 1) === carrier_arr[c]) {
          bindoff_carrier = carrier_arr[c];
          shaped_rows[i].includes('+') ? (bindoff_side = 'right') : (bindoff_side = 'left');
          break last_carrier;
        }
      }
    }
  }
  if (!short_row_carriers.includes(bindoff_carrier)) {
    bindOtherSide(short_row_carriers);
    bindoff_side === 'right' ? (Bxfer_needle = short_Xright_needle) : (Bxfer_needle = short_Xleft_needle);
    bindoff_count = short_Xright_needle - short_Xleft_needle + 1;
  } else {
    bindOtherSide(new_carriers);
    bindoff_side === 'right' ? (Bxfer_needle = Xright_needle) : (Bxfer_needle = Xleft_needle);
    bindoff_count = Xright_needle - Xleft_needle + 1;
  }
  BINDOFF(Bxfer_needle, bindoff_count, bindoff_side, double_bed);
  bindoff.push(xfer_section);
  xfer_section = [];
}
bindoff = bindoff.flat();
shaped_rows.push(bindoff);
shaped_rows = shaped_rows.flat();

//----------------------------
//***ADD OUT / OUTHOOK BACK IN
//----------------------------
//TODO: do this for inhook & releasehook for shima
let yarn_out;
sinkers ? (yarn_out = 'outhook') : (yarn_out = 'out');
((carriers_arr) => {
  short_row_section && !sinkers ? (carriers_arr = [...new_carriers, ...short_row_carriers]) : (carriers_arr = carriers);
  for (let i = 0; i <= carriers_arr.length; ++i) {
    let carrier_search = shaped_rows.map((el) => el.includes(` ${carriers_arr[i]}`) && el.includes(`knit`));
    let last = carrier_search.lastIndexOf(true);
    if (last !== -1) {
      shaped_rows.splice(last + 1, 0, `${yarn_out} ${carriers_arr[i]}`);
    }
  }
})();

//-------------------------
//***ADDITIONAL ERROR CHECK
//-------------------------
if (shaped_rows.some((line) => line.includes(undefined) || line.includes(NaN) || line.includes(null))) {
  console.log(chalk`{red.bold ERR:} {red file includes invalid value such as 'undefined'.}`);
  errors = true;
}

//--------------------------------
//***FINALLY, STRINGIFY FINAL_FILE
//--------------------------------
shaped_rows = shaped_rows.flat();
let final_file = JSON.stringify(shaped_rows).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
final_file = final_file.join('\n');

//-------------------------------------------
//***CHECK FOR ERRORS BEFORE WRITING THE FILE
//-------------------------------------------
if (!errors && !shape_error) {
  console.log(
    // chalk`{green \nno errors found :-) don't forget to change the new file name to 'command.kc' before uploading it to the machine!}\n{black.bgYellow ! WARNING:} {italic IT IS RECOMMENDED THAT YOU EMAIL THIS FILE TO:} {bold support@kniterate.com} {italic BEFORE USE TO ENSURE THAT NO DAMAGE WILL BE CAUSED TO YOUR MACHINE.\n***contact:} {bold info@edgygrandma.com} {italic if you have any questions about this program.}`
    chalk`{green \nno errors found :-)}\n{black.bgYellow ! WARNING:} {bold IT IS RECOMMENDED THAT YOU VIEW THE NEW FILE ON THE KNITOUT LIVE VISUALIZER} {italic (https://github.com/textiles-lab/knitout-live-visualizer)} {bold BEFORE USE TO ENSURE THAT IT WILL PRODUCE A KNIT TO YOUR LIKING.\n***contact:} {italic info@edgygrandma.com} {bold if you have any questions about this program.}`
  );
}

//-------------------------
//***WRITE THE FINAL FILE !
//-------------------------
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

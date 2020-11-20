//TODO: deal with situations where only shaping is short rowing (like sweater_front.jpg)
const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

let errors = false;
//--------------------------------------------------------------------------------------
//***RUN/GET VARIABLES FROM SHAPE-PROCESSOR.JS OR SHAPE-TEMPLATES.JS, EXTRACT SHAPE INFO
//--------------------------------------------------------------------------------------
let { shape_code, shape_code_reverse, shortrow_code, short_row_section, first_short_row, last_short_row, shape_error, shape_err_row } = require('./shape-processor');

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
let Template, piece_code1, piece_shortrow_codeL, piece_shortrow_codeR;
let stitch_patterns = [];
const PATTERN = ({ IDX, PATTERN }) => ({
  IDX,
  PATTERN,
});
// let pieces_arr;
if (shape_code === null) {
  Template = require('./shape-templates');
  piece_code1 = Object.values(Template.piece_obj1);
  piece_shortrow_codeL = Object.values(Template.piece_shortrow_objL);
  piece_shortrow_codeR = Object.values(Template.piece_shortrow_objR);
  pieces_arr = Object.values(Template.pieces_arr);
  /////
  for (let i = 0; i < piece_code1.length; ++i) {
    if (typeof piece_code1[i] === 'string') {
      stitch_patterns.push(
        PATTERN({
          IDX: i,
          PATTERN: piece_code1[i].split(' ')[1],
        })
      );
    }
  }
  /////
  // let idxs = piece_code1
  //   .map(function (value) {
  //     return patterns.indexOf(value);
  //   })
  //   .filter((el) => el !== -1);
  // let patterns = piece_code1.filter((el) => typeof el === 'string');
  // if (patterns.length > 0) {
  //   for (let i = 0; i < patterns.length; ++i) {
  //     stitch_patterns.push(
  //       PATTERN({
  //         IDX: undefined,
  //         PATTERN: patterns[i].split(' ')[1],
  //       })
  //     );
  //   }
  // }
  // if (patterns.length > 0) {
  //   patterns = patterns.map((el) => {
  //     return (el = el.split(' ')), (el = el[1]);
  //   });
  // }
  //////
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
      ////for when there are increases: check to see if the shape starts out smaller than max width
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
  if (shaping_arr.length === 0) {
    console.log(`no shaping in main body, just short rowing`); //new //remove //?
    shaping_arr.push(
      //new
      SHAPING({
        //new
        ROW: first_short_row - 2,
        LEFT: 0,
        RIGHT: 0,
      }),
      SHAPING({
        //new
        ROW: first_short_row - 1,
        LEFT: 0,
        RIGHT: 0,
      })
    );
  }
  if (short_row_section) {
    if (shape_code !== null) {
      shortRowSides(shortrow_code);
      shortRowInfo(0, 1, left_shortrow_arr, shape_code_reverse[shape_code_reverse.length - 1].indexOf(1), null); //left side
      shortRowInfo(2, 3, right_shortrow_arr, null, shape_code_reverse[shape_code_reverse.length - 1].lastIndexOf(1)); ////right side
    } else {
      shortRowSides(shortrow_code);
      shortRowInfo(0, 1, left_shortrow_arr, shape_code_reverse[shape_code_reverse.length - 1].indexOf(1), null); //left side
      shortrow_code = [...piece_shortrow_codeR];
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
    overwrite = readlineSync.keyInYNStrict(chalk.black.bgYellow(`! WARNING:`) + ` A file by the name of '${input}' already exists. Proceed and overwrite existing file?`);
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
  caston_section = caston_section.filter((el) => !el.includes('out ')); //// remove yarn-outs so can add them back in @ correct positions
}

let bg_color = caston_section.find((line) => line.includes(`;background color:`)); ////method to do fake seam carving (use background needles only when xfering in middle of panel)
bg_color = bg_color.charAt(bg_color.length - 1);

let draw_thread = caston_section.find((line) => line.includes(`;draw thread:`)); ////for shortrowcarriers, know that first one ends up on the right (because draw thread) and rest are on left
draw_thread = draw_thread.charAt(draw_thread.length - 1);

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
        if ((element.includes(' + ') || element.includes(' - ')) && element.charAt(element.length - 1) === c) {
          short_row_carriers = short_row_carriers.filter((el) => el !== c);
        }
      });
      c = Number(c);
    }
  }
}
let redefine_carriers = [];
let xtra_carriers = [];
if (short_row_section) xtra_carriers = short_row_carriers.filter((el) => !carriers.includes(el) && el !== draw_thread);

if (short_row_carriers.length < 3 && short_row_section && !sinkers) {
  console.log(
    chalk`{red.bold \nERR:} {red the section of the panel that will be altered to include short-rowing contains ${
      6 - short_row_carriers.length
    } colors, but the maximum color-count for that section is 3 (to allow for separate carriers to work either side while short-rowing).}`
  );
  errors = true;
}

//-------------------------------------------------------------------------------------
//***SHIFT CAST-ON SECTION OVER IF NECESSARY/ADD IN SHORTROW YARN CARRIERS IF NECESSARY
//-------------------------------------------------------------------------------------
//TODO: add this for shima caston
let header = [];
let yarns_in = [];
// let dropped_idx;
if ((row1_small || xtra_carriers.length > 0) && caston_section[1].includes(`kniterate`)) {
  header = caston_section;
  yarns_in = header.splice(header.findIndex((el) => el.includes(`;background color:`)) + 1);
  caston_section = yarns_in.splice(yarns_in.findIndex((el) => el.includes(`;kniterate yarns in`)));
  let dropped_idx = caston_section.indexOf(`;dropped extra needles`); //new
  let left_diff = row1_Lneedle - L_NEEDLE;
  let kniterate_caston = [];
  let need_to_drop = []; //new
  ////
  // kniterate_caston.push(yarns_in); //new
  kniterate_caston.flat(); //?
  ////
  yarnsin: for (let i = 0; i < yarns_in.length; ++i) {
    let line = yarns_in[i].split(' ');
    // if (line[0] === 'knit' || line[0] === 'miss' || line[0] === 'drop') {
    if (line[0] === 'knit' || line[0] === 'miss') {
      // let n;
      let n = 2;
      // line[0] === 'drop' ? (n = 1) : (n = 2);
      [bed, line[n]] = [line[n][0], line[n].substr(1)];
      let n_count = Number(line[n]) + left_diff;
      line[n] = `${bed}${n_count}`;
      if (n_count > row1_Rneedle && !need_to_drop.includes(n_count)) {
        //new
        need_to_drop.push(n_count);
      }
      kniterate_caston.push(line.join(' '));
      // } else {
    } else if (line[0] !== 'drop') {
      kniterate_caston.push(yarns_in[i]);
    }
  }
  ///
  if (xtra_carriers.length > 0) {
    let base = [...kniterate_caston];
    base.reverse();
    base.splice(base.findIndex((el) => el.includes('in '))); //TODO: maybe filter out x-stitch-number, etc. for base?
    base.reverse();
    for (let i = 0; i < xtra_carriers.length; ++i) {
      let xcarrier = xtra_carriers[i];
      let xtra_rows = base.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${xcarrier}`));
      kniterate_caston.push(`in ${xcarrier}`, xtra_rows);
    }
  }
  if (need_to_drop.length > 0) {
    for (let d = need_to_drop.length - 1; d >= 0; --d) {
      kniterate_caston.push(`drop b${need_to_drop[d]}`);
    }
    for (let d = 0; d < need_to_drop.length; ++d) {
      kniterate_caston.push(`drop f${need_to_drop[d]}`);
    }
  }
  caston: for (let i = 0; i < caston_section.length; ++i) {
    let line = caston_section[i].split(' ');
    // let last_drop;
    if (line[0] === 'knit' || line[0] === 'miss' || line[0] === 'drop') {
      // if (line[0] === 'knit' || line[0] === 'miss') {
      // let n;
      let n = 2;
      line[0] === 'drop' ? (n = 1) : (n = 2);
      [bed, line[n]] = [line[n][0], line[n].substr(1)];
      let n_count = Number(line[n]) + left_diff;
      line[n] = `${bed}${n_count}`;
      // if (i <= dropped_idx) {
      //   //TODO: check to see if issue when idx === -1
      //   if (i < dropped_idx) {
      //     if (i === dropped_idx - 1) last_drop = line[n].slice(1); //check
      //     kniterate_caston.push(line.join(' '));
      //   } else {
      //     //check
      //     if (last_drop - 1 != row1_Rneedle) {
      //       for (let s = last_drop - 1; s > row1_Rneedle; --s) {
      //         kniterate_caston.push(`drop b${s}`);
      //       }
      //       for (let s = row1_Rneedle + 1; s < last_drop; ++s) {
      //         kniterate_caston.push(`drop f${s}`);
      //       }
      //     }
      //   }
      // } else {
      if (n_count <= row1_Rneedle) {
        kniterate_caston.push(line.join(' '));
      } else {
        continue caston;
      }
      // }
    } else {
      // } else if (line[0] !== 'drop') {
      kniterate_caston.push(caston_section[i]); //check if this gets x-roller-advance, etc.
    }
  }
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
// let dir, needle, carrier; //check (moved) //? //TODO: deal with nulls
for (let i = 0; i < in_file.length; ++i) {
  let pass_check = [];
  let row = [];
  let pass = [];
  pass_loop: for (let p = 0; p < in_file[i].length; ++p) {
    let op_arr = in_file[i][p].split(' ');
    let type = op_arr[0];
    let dir, needle, carrier; //check (moved) //?
    if (type.includes(';') || type.includes('out')) {
      //TODO: maybe push comments
      continue pass_loop;
      // type = 'comment';
      // dir = needle = carrier = null;
    }
    ////
    if (type === `x-stitch-number` || type === `x-roller-advance` || type === `x-add-roller-advance` || type === `rack`) {
      //new //check
      pass.push(in_file[i][p]);
      continue pass_loop;
    }
    ///
    // if (type.includes('hook') || type.includes('out')) { //go back! //?
    //   //TODO: maybe use this to do the inhook + releasehook for shima... maybe just to preserve it (push it to pass but make sure it doesn't throw off pass check)
    //   op_arr.length > 2 ? (carrier = op_arr.slice(1)) : (carrier = op_arr[1]);
    //   let side;
    //   pass_check[pass_check.length - 1].DIR === '+' ? (side = 'right') : (side = 'left');
    //   final_carrier_pos.push(
    //     CARRIER_PARK({
    //       CARRIER: carrier,
    //       SIDE: side,
    //       ROW: rows.length,
    //       IDX: row.length,
    //     })
    //   );
    //   dir = needle = null; //remove //?
    //   continue pass_loop;
    // } //?
    // if (type !== 'xfer') { //go back! //?
    if (type !== 'xfer' && type !== 'drop') {
      //TODO: add support for xfer & drop ?
      op_arr[1] === '+' || '-'
        ? ((dir = op_arr[1]), (needle = op_arr[2]), op_arr.length < 4 ? (carrier = null) : (carrier = op_arr[3]))
        : ((dir = null), (needle = op_arr[1]), (carrier = null));
    }
    ////
    // if (carrier === null) console.log(in_file[i][p]); //remove //TODO: figure out what those things are that are just ''
    if (short_row_section && pass_check.length > 0) {
      //new
      if (rows.length < first_short_row) {
        //TODO: check whether it should be <=
        let side;
        pass_check[pass_check.length - 1].DIR === '+' ? (side = 'right') : (side = 'left');
        let carrier_idx = final_carrier_pos.findIndex((el) => el.CARRIER == carrier);
        // if (!final_carrier_pos.some((el) => el.CARRIER == carrier)) {
        if (carrier !== null) {
          if (carrier_idx === -1) {
            //check & confirm that this is what findIndex returns
            final_carrier_pos.push(
              CARRIER_PARK({
                CARRIER: carrier,
                SIDE: side,
                ROW: rows.length,
                IDX: row.length,
              })
            );
          } else {
            final_carrier_pos[carrier_idx].SIDE = side;
            final_carrier_pos[carrier_idx].ROW = rows.length;
            final_carrier_pos[carrier_idx].IDX = row.length;
          }
        }
      }
    } //new
    ///
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
  }
  rows.push(row);
}

// console.log(rows.length); //remove
// console.log(final_carrier_pos); //new //remove
//-------------------------------------------------------------------------------
//***DETERMINE IF SINGLE OR DOUBLE BED //; IDENTIFY THE LEFT & RIGHT MOST NEEDLES
//-------------------------------------------------------------------------------
let needle_count_arr = rows.flat(2);
let double_bed;
needle_count_arr.some((el) => el.includes('knit') && el.includes(' b')) ? (double_bed = true) : (double_bed = false);

needle_count_arr = needle_count_arr.map((el) => el.match(/\d+/g));
needle_count_arr = needle_count_arr.map((arr) => arr.splice(0, 1));
needle_count_arr = needle_count_arr.map((el) => Number(el));

//----------------------------------------
//***DEFINE STARTING VALUE OF SIDE NEEDLES
//----------------------------------------
let Xleft_needle = L_NEEDLE;
let Xright_needle = R_NEEDLE;
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
  //TODO: maybe fix this so there's no rack 2 or rack -2 (like with double bed funcs)
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
const dec1DoubleBed = (dec_needle, side) => {
  ////if double bed, need to just do it twice
  if (side === 'left') {
    xfer_section.push(`rack 1`);
    xfer_section.push(`x-add-roller-advance 150`); //new
    xfer_section.push(`xfer b${dec_needle} f${dec_needle + 1}`);
    xfer_section.push(`xfer b${dec_needle + 1} f${dec_needle + 2}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`x-add-roller-advance 100`); //new
    xfer_section.push(`xfer f${dec_needle} b${dec_needle + 1}`);
    // xfer_section.push(`xfer f${dec_needle} b${dec_needle}`);
    // xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 1}`);
    // xfer_section.push(`rack 1`);
    // xfer_section.push(`xfer b${dec_needle} f${dec_needle + 1}`);
  }
  if (side === 'right') {
    xfer_section.push(`rack -1`);
    xfer_section.push(`x-add-roller-advance 150`); //new
    xfer_section.push(`xfer b${dec_needle} f${dec_needle - 1}`);
    xfer_section.push(`xfer b${dec_needle - 1} f${dec_needle - 2}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`x-add-roller-advance 100`); //new
    xfer_section.push(`xfer f${dec_needle} b${dec_needle - 1}`);
  }
  xfer_section.push(`rack 0`);
};
// ////dec 1 ? count = 3 (w/alt), then 2 & rack = 1, then 2; dec2 ? count =  & rack = ;
// const dec1DoubleBed = (dec_needle, side) => {
//   ////if double bed, need to just do it twice
//   if (side === 'left') {
//     xfer_section.push(`rack 1`);
//     LEFT_XFER(xfer_section, dec_needle - 1, 3, 'f', 1, true); ////-1 so const function (with rack param adjustment) still works
//     xfer_section.push(`rack 2`);
//     LEFT_XFER(xfer_section, dec_needle - 1, 2, 'b', 2, false);
//   }
//   if (side === 'right') {
//     xfer_section.push(`rack -1`);
//     RIGHT_XFER(xfer_section, dec_needle + 1, 3, 'f', -1, true);
//     xfer_section.push(`rack -2`);
//     RIGHT_XFER(xfer_section, dec_needle + 1, 2, 'b', -2, false);
//   }
//   xfer_section.push(`rack 0`);
// };

const dec2DoubleBed = (dec_needle, side) => {
  if (side === 'left') {
    xfer_section.push(`x-add-roller-advance 100`); //new
    xfer_section.push(`xfer b${dec_needle + 2} f${dec_needle + 2}`);
    xfer_section.push(`xfer b${dec_needle + 3} f${dec_needle + 3}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`x-add-roller-advance 150`); //new
    xfer_section.push(`xfer f${dec_needle} b${dec_needle + 1}`);
    xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 2}`);
    xfer_section.push(`xfer f${dec_needle + 2} b${dec_needle + 3}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`x-add-roller-advance 100`); //new
    xfer_section.push(`xfer b${dec_needle} f${dec_needle + 1}`);
    xfer_section.push(`xfer b${dec_needle + 1} f${dec_needle + 2}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`x-add-roller-advance 50`); //new
    xfer_section.push(`xfer f${dec_needle + 1} b${dec_needle + 2}`);
  } else if (side === 'right') {
    xfer_section.push(`x-add-roller-advance 100`); //new
    xfer_section.push(`xfer b${dec_needle - 2} f${dec_needle - 2}`);
    xfer_section.push(`xfer b${dec_needle - 3} f${dec_needle - 3}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`x-add-roller-advance 150`); //new
    xfer_section.push(`xfer f${dec_needle} b${dec_needle - 1}`);
    xfer_section.push(`xfer f${dec_needle - 1} b${dec_needle - 2}`);
    xfer_section.push(`xfer f${dec_needle - 2} b${dec_needle - 3}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`x-add-roller-advance 100`); //new
    xfer_section.push(`xfer b${dec_needle} f${dec_needle - 1}`);
    xfer_section.push(`xfer b${dec_needle - 1} f${dec_needle - 2}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`x-add-roller-advance 50`); //new
    xfer_section.push(`xfer f${dec_needle - 1} b${dec_needle - 2}`);
  }
  xfer_section.push(`rack 0`);
};

// const dec2DoubleBed = (dec_needle, side) => {
//   ////dec_needle2 & count2 could be null (if only dec on one side); if not null, should be right dec needle
//   if (side === 'left') {
//     LEFT_XFER(xfer_section, dec_needle + 1, 1, 'f', 0, false); ////+1 so const function (with rack param adjustment) still works
//     xfer_section.push(`rack 1`);
//     LEFT_XFER(xfer_section, dec_needle, 1, 'b', 1, false);
//     xfer_section.push(`rack -2`);
//     LEFT_XFER(xfer_section, dec_needle + 2, 3, 'f', -2, false);
//     xfer_section.push(`rack 1`);
//     LEFT_XFER(xfer_section, dec_needle + 1, 1, 'b', 1, false);
//   } else if (side === 'right') {
//     RIGHT_XFER(xfer_section, dec_needle - 1, 1, 'f', 0, false);
//     xfer_section.push(`rack -1`);
//     RIGHT_XFER(xfer_section, dec_needle, 1, 'b', -1, false);
//     xfer_section.push(`rack 2`);
//     RIGHT_XFER(xfer_section, dec_needle - 2, 3, 'f', 2, false);
//     xfer_section.push(`rack -1`);
//     RIGHT_XFER(xfer_section, dec_needle - 1, 1, 'b', -1, false);
//   }
//   xfer_section.push(`rack 0`);
// };

//--------------------------
//***PROTO BIND-OFF FUNCTION
//--------------------------
let bindoff_carrier;
let bindoff_time = false;
const BINDOFF = (xfer_needle, count, side, double_bed) => {
  if (side === 'right') {
    xfer_needle = xfer_needle - count + 1;
  }
  const posLoop = (op, bed) => {
    pos: for (let x = xfer_needle; x < xfer_needle + count; ++x) {
      if (op === 'knit') {
        xfer_section.push(`knit + ${bed}${x} ${bindoff_carrier}`);
      }
      if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
          if (x === xfer_needle) xfer_section.push(`x-add-roller-advance 200`); //new //?
        }
        xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
      }
      if (op === 'bind') {
        //TODO: make additions only for bindoff time ?
        ///
        let roll_add;
        x <= xfer_needle + 2 ? (roll_add = 80) : (roll_add = 50); //new (for 1, should be last 80 abover xfer b3->f3)
        if (x === xfer_needle) roll_add += 70;
        ////
        if (x === xfer_needle + count - 1 && bindoff_time) {
          break pos;
        }
        ////
        if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
          xfer_section.push(`x-add-roller-advance ${roll_add}`);
        }
        xfer_section.push(`xfer b${x} f${x}`);
        xfer_section.push(`rack -1`);
        ///
        // if (x === xfer_needle + 4) {
        if (bindoff_time) {
          //new //come back! (decide if these should only be for bindoff_time)
          if (x === xfer_needle) {
            xfer_section.push(`x-add-roller-advance 350`);
          } else {
            xfer_section.push(`x-add-roller-advance 200`);
          }
        }
        xfer_section.push(`xfer f${x} b${x + 1}`);
        xfer_section.push(`rack 0`);
        if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
          if (x === xfer_needle) xfer_section.push(`x-add-roller-advance 400`); //new
          if (x === xfer_needle + 1) xfer_section.push(`x-add-roller-advance 100`); //new
          if (x === xfer_needle + 7 || (x % 5 === 0 && x > xfer_needle + 7 && xfer_needle - x >= 5))
            xfer_section.push(`x-add-roller-advance -400`, `miss + b${x} ${bindoff_carrier}`); //new //should be after xfer f9 b8
          if (x === xfer_needle + count - 2) xfer_section.push(`x-stitch-number 3`, `x-roller-advance 150`);
        }
        xfer_section.push(`knit + b${x + 1} ${bindoff_carrier}`);
        ///
        // if (x === xfer_needle + 4) xfer_section.push(`x-roller-advance 200`); //new //?
        // xfer_section.push(`x-add-roller-advance 50`); //new //?
        // xfer_section.push(`xfer b${x} f${x}`);
        // xfer_section.push(`rack -1`);
        // xfer_section.push(`x-add-roller-advance 200`); //new //?
        // xfer_section.push(`xfer f${x} b${x + 1}`);
        // xfer_section.push(`rack 0`);
        // xfer_section.push(`knit + b${x + 1} ${bindoff_carrier}`);
      }
    }
  };
  const negLoop = (op, bed) => {
    //TODO: make additions only for bindoff time ?
    neg: for (let x = xfer_needle + count - 1; x >= xfer_needle; --x) {
      if (op === 'knit') {
        xfer_section.push(`knit - ${bed}${x} ${bindoff_carrier}`);
      }
      if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
          if (x === xfer_needle + count - 1) xfer_section.push(`x-add-roller-advance 200`); //new //? //TODO: determine if these should only be for final bindoff, or for decs by bindoff method too
        }
        xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
      }
      if (op === 'bind') {
        //////////
        let roll_add;
        x >= xfer_needle + count - 3 ? (roll_add = 80) : (roll_add = 50); //new (for 16, should be last 80 abover xfer b14->f14)
        if (x === xfer_needle + count - 1) roll_add += 70;
        /////////
        if (x === xfer_needle && bindoff_time) {
          break neg;
        }
        /////////////
        if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
          xfer_section.push(`x-add-roller-advance ${roll_add}`);
        }
        xfer_section.push(`xfer b${x} f${x}`);
        xfer_section.push(`rack 1`);
        // if (x === xfer_needle + count - 5) {
        if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
          if (x === xfer_needle + count - 1) {
            //new
            xfer_section.push(`x-add-roller-advance 350`);
          } else {
            xfer_section.push(`x-add-roller-advance 200`);
          }
        }
        xfer_section.push(`xfer f${x} b${x - 1}`);
        xfer_section.push(`rack 0`);
        if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
          if (x === xfer_needle + count - 1) xfer_section.push(`x-add-roller-advance 400`); //new
          if (x === xfer_needle + count - 2) xfer_section.push(`x-add-roller-advance 100`); //new
          if (x === xfer_needle + count - 8 || (x % 5 === 0 && x < xfer_needle + count - 8 && x >= 5))
            xfer_section.push(`x-add-roller-advance -400`, `miss + b${x} ${bindoff_carrier}`); //new //should be after xfer f9 b8
          if (x === xfer_needle + 1) xfer_section.push(`x-stitch-number 3`, `x-roller-advance 150`);
        }
        xfer_section.push(`knit - b${x - 1} ${bindoff_carrier}`);
        /////////
        // if (x === xfer_needle + count - 5) xfer_section.push(`x-roller-advance 200`); //new //?
        // xfer_section.push(`x-add-roller-advance 50`); //new //?
        // xfer_section.push(`xfer b${x} f${x}`);
        // xfer_section.push(`rack 1`);
        // xfer_section.push(`x-add-roller-advance 200`); //new //?
        // xfer_section.push(`xfer f${x} b${x - 1}`);
        // xfer_section.push(`rack 0`);
        // xfer_section.push(`knit - b${x - 1} ${bindoff_carrier}`);
      }
    }
  };
  ////
  // const bindoffTag = (last_needle, dir) => {
  //   xfer_section.push(`x-stitch-number 4`); //new
  //   xfer_section.push(`x-roller-advance 50`); //new
  //   xfer_section.push(`;tag`);
  //   let odd_last = true;
  //   if (last_needle % 2 === 0) odd_last = false;
  //   xfer_section.push(`miss ${dir} b${last_needle - 1} ${bindoff_carrier}`);
  //   let tag_limL = last_needle - 1;
  //   let tag_limR = last_needle + 7;
  //   ///////
  //   const negTag = (r) => {
  //     for (let n = tag_limR; n >= tag_limL; --n) {
  //       if (odd_last) {
  //         if (n % 2 !== 0) xfer_section.push(`knit - b${n} ${bindoff_carrier}`); //moved (was with if(odd_last) {) //check!
  //         if (tag_limL % 2 === 0 && n === tag_limL) xfer_section.push(`miss - b${n} ${bindoff_carrier}`);
  //       } else if (!odd_last) {
  //         if (n % 2 === 0) xfer_section.push(`knit - b${n} ${bindoff_carrier}`);
  //         if (tag_limL % 2 !== 0 && n === tag_limL) xfer_section.push(`miss - b${n} ${bindoff_carrier}`);
  //       }
  //     }
  //     if (r === tag_rows - 1) {
  //       for (let n = tag_limL; n <= tag_limR; ++n) {
  //         xfer_section.push(`drop b${n}`);
  //       }
  //     }
  //   };
  //   //////
  //   const posTag = (r) => {
  //     for (let n = tag_limL; n <= tag_limR; ++n) {
  //       if (odd_last) {
  //         if (n % 2 === 0) xfer_section.push(`knit + b${n} ${bindoff_carrier}`);
  //         if (tag_limR % 2 !== 0 && n === tag_limR) xfer_section.push(`miss + b${n} ${bindoff_carrier}`);
  //       } else if (!odd_last) {
  //         if (n % 2 !== 0) xfer_section.push(`knit + b${n} ${bindoff_carrier}`);
  //         if (tag_limR % 2 === 0 && n === tag_limR) xfer_section.push(`miss + b${n} ${bindoff_carrier}`);
  //       }
  //     }
  //     /////
  //     if (r === tag_rows - 1) {
  //       xfer_section.push(`x-stitch-number 5`); //new //?
  //       for (let n = tag_limL; n <= tag_limR; ++n) {
  //         xfer_section.push(`drop b${n}`);
  //       }
  //     }
  //   };
  //   /////
  //   let tag_rows;
  //   odd_last ? (tag_rows = 8) : (tag_rows = 9); //new //?
  //   for (let r = 0; r < tag_rows; ++r) {
  //     if (dir === '+') {
  //       r % 2 === 0 ? negTag(r) : posTag(r);
  //     } else {
  //       r % 2 === 0 ? posTag(r) : negTag(r);
  //     }
  //   }
  // };
  /////
  const bindoffTail = (last_needle, dir) => {
    let otherT_dir, miss1, miss2;
    dir === '+' ? ((otherT_dir = '-'), (miss1 = last_needle + 1), (miss2 = last_needle - 1)) : ((otherT_dir = '+'), (miss1 = last_needle - 1), (miss2 = last_needle + 1));
    xfer_section.push(`x-roller-advance 200`);
    xfer_section.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
    for (let i = 0; i < 6; ++i) {
      xfer_section.push(`knit ${otherT_dir} b${last_needle} ${bindoff_carrier}`);
      xfer_section.push(`miss ${otherT_dir} b${miss2} ${bindoff_carrier}`);
      xfer_section.push(`knit ${dir} b${last_needle} ${bindoff_carrier}`);
      xfer_section.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
      if (i === 0) xfer_section.push(`x-stitch-number 4`);
    }
    xfer_section.push(`x-add-roller-advance 200`);
    xfer_section.push(`drop b${last_needle}`);
  };
  //////
  if (side === 'left') {
    if (bindoff_time) {
      //new //come back! (decide if these should only be for bindoff_time)
      posLoop('knit', 'f');
      xfer_section.push(`x-add-roller-advance 100`);
      if (double_bed) negLoop('knit', 'b');
    }
    posLoop('xfer', 'f');
    if (bindoff_time) {
      //new //come back! (decide if these should only be for bindoff_time)
      if (double_bed) posLoop('knit', 'b'); //new
      xfer_section.push(`x-stitch-number 3`);
      xfer_section.push(`x-add-roller-advance 600`); //new
      negLoop('knit', 'b');
      xfer_section.push(`x-stitch-number 2`); //new
      xfer_section.push(`x-roller-advance 300`); //new
      xfer_section.push(`x-add-roller-advance 400`); //new
      xfer_section.push(`knit + b${xfer_needle} ${bindoff_carrier}`); //new (knit once with small stitch size)
    }
    // xfer_section.push(`x-roller-advance 250`); //new
    posLoop('bind', null);
    if (bindoff_time) bindoffTail(xfer_needle + count - 1, '+'); //new
  } else if (side === 'right') {
    if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
      negLoop('knit', 'f');
      xfer_section.push(`x-add-roller-advance 100`); //new
      if (double_bed) posLoop('knit', 'b'); //new
    }
    // if (double_bed) posLoop('knit', 'f');
    // if (double_bed) negLoop('knit', 'b');
    negLoop('xfer', 'f');
    if (bindoff_time) { //new //come back! (decide if these should only be for bindoff_time)
      if (double_bed) negLoop('knit', 'b');
      xfer_section.push(`x-stitch-number 3`); //new
      xfer_section.push(`x-add-roller-advance 600`); //new //was 400
      posLoop('knit', 'b'); //new
      xfer_section.push(`x-stitch-number 2`); //new
      xfer_section.push(`x-roller-advance 300`); //new //was 250 and after knit end needle
      xfer_section.push(`x-add-roller-advance 400`); //new
      xfer_section.push(`knit - b${xfer_needle + count - 1} ${bindoff_carrier}`); //new (knit once with small stitch size)
    }
      negLoop('bind', null);
    if (bindoff_time) bindoffTail(xfer_needle, '-'); //new
  }
  // if (!bindoff_time) xfer_section.push(`x-roller-advance 100`); //new need to //check //come back! //go back! //?
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
      --Xside_needle;
    }
    xfer_section.push(`rack 0`);
  } else if (side === 'right') {
    for (let b = 0; b < bg_side.length; ++b) {
      let shift_count = Math.abs(Xside_needle - bg_side[b]) + 1;
      LEFT_XFER(xfer_section, bg_side[b], shift_count, 'f', 0, false);
      xfer_section.push(`rack 1`);
      LEFT_XFER(xfer_section, bg_side[b], shift_count, 'b', 1, false);
      xfer_section.push(`rack 0`);
      ++Xside_needle;
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

// const incDoubleBed = (Xside_needle, side) => {
//   xfer_section.push(`rack -2`);
//   if (side === 'left') {
//     xfer_section.push(`xfer b${Xside_needle + 1} f${Xside_needle - 1}`);
//     bg_needles.push(`b${Xside_needle + 1}`);
//     xfer_section.push(`rack 2`);
//     xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle - 1}`);
//     bg_needles.push(`f${Xside_needle + 1}`);
//   } else if (side === 'right') {
//     xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle + 1}`);
//     bg_needles.push(`f${Xside_needle - 1}`);
//     xfer_section.push(`rack 2`);
//     xfer_section.push(`xfer b${Xside_needle - 1} f${Xside_needle + 1}`);
//     bg_needles.push(`b${Xside_needle - 1}`);
//   }
//   xfer_section.push(`rack 0`);
// };

let LtwistedF, LtwistedB, RtwistedF, RtwistedB;
const inc1DoubleBed = (Xside_needle, side) => {
  //TODO: make this work for more than one inc
  if (side === 'left') {
    xfer_section.push(`rack -1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
    xfer_section.push(`rack 0`);
    xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 1}`);
    xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
    LtwistedF = true;
    LtwistedB = true;
  } else if (side === 'right') {
    xfer_section.push(`rack 1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
    xfer_section.push(`rack 0`);
    xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 1}`);
    xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
    xfer_section.push(`rack 0`);
    RtwistedF = true;
    RtwistedB = true;
  }
  xfer_section.push(`rack 0`);
};

const inc2DoubleBed = (Xside_needle, side) => {
  if (side === 'left') {
    xfer_section.push(`rack -1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 2}`);
    xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle}`);
    xfer_section.push(`rack 0`);
    xfer_section.push(`xfer b${Xside_needle - 2} f${Xside_needle - 2}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
    xfer_section.push(`rack 0`);
    xfer_section.push(`xfer b${Xside_needle + 1} f${Xside_needle + 1}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 2}`);
    xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle}`);
    LtwistedF = true;
    LtwistedB = true;
  } else if (side === 'right') {
    xfer_section.push(`rack 1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle}`);
    xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 2}`);
    xfer_section.push(`rack 0`);
    xfer_section.push(`xfer b${Xside_needle + 2} f${Xside_needle + 2}`);
    xfer_section.push(`rack 1`);
    xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
    xfer_section.push(`rack 0`);
    xfer_section.push(`xfer b${Xside_needle - 1} f${Xside_needle - 1}`);
    xfer_section.push(`rack -1`);
    xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle}`);
    xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 2}`);
    RtwistedF = true;
    RtwistedB = true;
  }
  xfer_section.push(`rack 0`);
};

const incMultDoubleBed = (Xside_needle, count, side) => {
  xfer_section.push(`rack 0.25`); ////half rack
  if (side === 'left') {
    for (let x = Xside_needle - 1; x >= Xside_needle - count; --x) {
      xfer_section.push(`knit - b${x} ${bindoff_carrier}`);
      xfer_section.push(`knit - f${x} ${bindoff_carrier}`); //TODO: determine carrier
    }
  } else if (side === 'right') {
    for (let x = Xside_needle + 1; x <= Xside_needle + count; ++x) {
      xfer_section.push(`knit + f${x} ${bindoff_carrier}`); //TODO: determine carrier
      xfer_section.push(`knit + b${x} ${bindoff_carrier}`);
    }
  }
  xfer_section.push(`rack 0`);
};

//---------------------------------
//***PROTO STITCH PATTERN FUNCTIONS
//---------------------------------
let pattern_height;
function toggleBed(bed) {
  bed === 'f' ? (bed = 'b') : (bed = 'f');
}
let stitchpat_section = [];
let xfer_bed, knit_bed;
// let pattern_length;

////define carrier param as '' if not used
// const POS_PASS = (op, dir, bed, carrier) => {
const POS_PASS = (leftN, rightN, op, bed, spec, carrier) => {
  // dir === undefined ? dir = '' : dir = ` ${dir} `;
  // if (dir !== '') dir = ` ${dir}`;
  // for (let n = Xleft_needle; n <= Xright_needle; ++n) {
  for (let n = leftN; n <= rightN; ++n) {
    // stitchpat_section.push(`${op}${dir} ${bed}${n} ${carrier}`.trimEnd());
    stitchpat_section.push(`${op} + ${bed}${n} ${carrier}`.trimEnd());
    if (spec === 'half rack') stitchpat_section.push(`${op} + b${n} ${carrier}`.trimEnd());
  }
};
const NEG_PASS = (rightN, leftN, op, bed, spec, carrier) => {
  // if (dir !== '') dir = ` ${dir}`;
  for (let n = rightN; n >= leftN; --n) {
    if (alt === true && (x - xfer_needle) % 2 !== 0) {
      continue;
    }
    // stitchpat_section.push(`${op}${dir} ${bed}${n} ${carrier}`.trimEnd());
    stitchpat_section.push(`${op} - ${bed}${n} ${carrier}`.trimEnd());
    if (spec === 'half rack') stitchpat_section.push(`${op} - b${n} ${carrier}`.trimEnd());
    // if (spec === 'alt beds') bed === 'f' ? (bed = 'b') : (bed = 'f');
    if (spec === 'alt beds') toggleBed(bed);
  }
};
const rib1x1Stitch = (prev_dir, carrier) => {
  //TODO: and xfers so needles are on correct bed ?
  if (stitchpat_section.length === 0) stitchpat_section.push(`rack 0.25`); ////0.5, but 0.25 for now so visualizer can get it
  if (prev_dir === '+') {
    NEG_PASS(Xright_needle, Xleft_needle, 'knit', 'f', 'half rack', carrier);
  } else {
    POS_PASS(Xleft_needle, Xright_needle, 'knit', 'f', 'half rack', carrier);
  }
};

const rib2x2Stitch = (prev_dir, carrier) => {};

const rib3x3Stitch = (prev_dir, carrier) => {};

const rib4x4Stitch = (prev_dir, carrier) => {};

//come back! ^ make sure when acutally using this, insert `rack 0` at end
const seedStitch = (prev_dir, carrier) => {
  //come back! //? //FIXME: (aka Q) is it okay to tell the machine to xfer from needles with no stitches? (so don't have to go thru & check with needles on backbed have stitches)
  if (stitchpat_section.length === 0) xfer_bed = 'f';
  if (prev_dir === '+') {
    if (double_bed && stitchpat_section.length === 0) RIGHT_XFER((stitchpat_section, Xright_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false)); //+1//?
    LEFT_XFER(stitchpat_section, Xleft_needle, Xright_needle - Xleft_needle + 1, xfer_bed, 0, true); //+1//?
    NEG_PASS(Xright_needle, Xleft_needle, 'knit', 'b', 'alt beds', carrier);
  } else {
    if (double_bed && stitchpat_section.length === 0) LEFT_XFER(stitchpat_section, Xleft_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false); //+1//?
    RIGHT_XFER(stitchpat_section, Xright_needle, Xright_needle - Xleft_needle + 1, xfer_bed, 0, true); //+1//?
    POS_PASS(Xleft_needle, Xright_needle, 'knit', 'b', 'alt beds', carrier);
  }
  // xfer_bed === 'f' ? (xfer_bed = 'b') : (xfer_bed = 'f');
  toggleBed(xfer_bed);
};

const entrelacStitch = (prev_dir, carrier) => {};

const waffleStitch = (prev_dir, carrier) => {};

const irishMossStitch = (prev_dir, carrier) => {};

const piqueRibStitch = (prev_dir, carrier) => {};

const garterStitch = (prev_dir, carrier) => {};

let leftoverN, leftovers;
let first_time = false;
const checkerStitch = (prev_dir, carrier) => {
  let checker_width, checker_height, xfer_size;
  if ((Xright_needle - Xleft_needle + 1) % 6 === 0 || (Xright_needle - Xleft_needle + 1) % 5 !== 0) {
    checker_width = 6;
    checker_height = 8;
  } else {
    checker_width = 5;
    checker_height = 6;
  }
  if (stitchpat_section.length === 0) (xfer_bed = 'f'), (knit_bed = 'b'), (first_time = true), (pattern_height = 1);
  const negChecker = () => {
    neg_checker: for (let n = Xright_needle; n >= Xleft_needle + checker_width * 2; n -= checker_width * 2) {
      leftovers && n === Xright_needle ? (xfer_size = leftoverN) : (xfer_size = checker_width);
      LEFT_XFER(xfer_section, n, xfer_size, xfer_bed, 0, false); //+1//?
      if (prev_dir === '+') {
        // knit_checker: for (let s = n; s > n - checker_width * 2; --s) {
        knit_checker: for (let s = n; s > n - (checker_width + xfer_size); --s) {
          if (s < Xleft_needle) break knit_checker;
          if (s > n - xfer_size) {
            stitchpat_section.push(`knit - ${knit_bed}${s} ${carrier}`);
          } else {
            stitchpat_section.push(`knit - ${xfer_bed}${s} ${carrier}`);
          }
        }
      }
      // NEG_PASS(n, n - checker_width, 'knit', knit_bed, null, carrier);
      if (first_time) {
        // if (Xright_needle - n < checker_width && Xright_needle - n !== 0) {
        if (n - checker_width <= Xleft_needle && n - checker_width !== 0) {
          // checker_width = Xright_needle - n;
          // checker_width = n - checker_width;
          leftoverN = n - checker_width;
          leftovers = true;
          break neg_checker;
        } else {
          leftovers = false;
        }
        // n += checker_width;
        // n -= checker_width;
        first_time = false;
      }
    }
  };
  const posChecker = () => {
    pos_checker: for (let n = Xleft_needle; n < Xright_needle - checker_width * 2; n += checker_width * 2) {
      leftovers && n === Xleft_needle ? (xfer_size = leftoverN) : (xfer_size = checker_width);
      RIGHT_XFER(xfer_section, n, xfer_size, xfer_bed, 0, false); //+1//?
      if (prev_dir === '-') {
        knit_checker: for (let s = n; s < n + (checker_width + xfer_size); ++s) {
          if (s > Xright_needle) break knit_checker;
          if (s < n + xfer_size) {
            stitchpat_section.push(`knit + ${knit_bed}${s} ${carrier}`);
          } else {
            stitchpat_section.push(`knit + ${xfer_bed}${s} ${carrier}`);
          }
        }
      }
      if (first_time) {
        if (n + checker_width >= Xright_needle && Xright_needle - n !== 0) {
          // checker_width = n - checker_width;
          leftoverN = n + 1;
          leftovers = true;
          break pos_checker;
        } else {
          leftovers = false;
        }
        first_time = false;
      }
    }
  };
  if (prev_dir === '+') {
    if (double_bed && stitchpat_section.length === 0) RIGHT_XFER((stitchpat_section, Xright_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false)); //+1//?
    negChecker();
    if (pattern_height % checker_height === 0 || pattern_height === 1) {
      toggleBed(xfer_bed);
      posChecker();
      stitchpat_section.unshift(xfer_section).flat();
    }
  } else {
    if (double_bed && stitchpat_section.length === 0) LEFT_XFER(stitchpat_section, Xleft_needle, Xright_needle - Xleft_needle + 1, 'b', 0, false); //+1//?
    posChecker();
    if (pattern_height % checker_height === 0 || pattern_height === 1) {
      toggleBed(xfer_bed);
      //TODO: make this something like if % rowsofthepattern === 0, okay now make this something you deal with in the main function
      negChecker();
      stitchpat_section.unshift(xfer_section).flat();
      // toggleBed(xfer_bed);
    }
  }
  ++pattern_height;
};

const laceStitch = (prev_dir, carrier) => {};
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
        side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC);
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
      if (stitches1 === 1) {
        inc1DoubleBed(xfer_needle1, side1);
      } else if (stitches1 === 2) {
        inc2DoubleBed(xfer_needle1, side1);
      } else {
        side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC);
        incMultDoubleBed(xfer_needle1, stitches1, side1);
      }
      if (side === 'both') {
        xfer_section.push(`;inc ${stitches2} on right`);
        if (stitches2 === 1) {
          inc1DoubleBed(xfer_needle2, 'right');
        } else if (stitches2 === 2) {
          inc2DoubleBed(xfer_needle2, 'right');
        } else {
          bindoff_carrier = right_bindC;
          incMultDoubleBed(xfer_needle2, stitches2, 'right');
        }
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
          bindoff_carrier = right_bindC;
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
// let Xleft_needle = L_NEEDLE;
// let Xright_needle = R_NEEDLE;
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
      xfer_row_interval = 1; //necessary? / move down//?
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
    /////
    // let skip = false; //new
    // if (cookie.includes('x-roller-advance') || cookie.includes('x-add-roller-advance') || cookie.includes('x-stitch-number') || cookie.includes('rack')) {
    //   //new
    //   skip = true;
    //   console.log(cookie); //remove (TODO: make sure this doesn't include passes etc.)
    // } //come back! //check
    ////
    // if (!skip) {
    //new //?
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
    if (XleftN !== L_NEEDLE || XrightN !== R_NEEDLE) {
      let cookie_dir, cookie_carrier, end_needle;
      find_dir: for (let d = 0; d < cookie.length; ++d) {
        if (cookie[d].includes(`+`)) {
          cookie_dir = '+';
          cookie_carrier = cookie[d].charAt(cookie[d].length - 1);
          break find_dir;
        } else if (cookie[d].includes(`-`) && !cookie[d].includes(`rack`)) {
          //TODO: maybe also add ! includes.(`;`) //?
          cookie_dir = '-';
          cookie_carrier = cookie[d].charAt(cookie[d].length - 1);
          break find_dir;
        }
      }
      let endN = false;
      function findEndNeedle(end_needle) {
        find_endN: for (let e = 0; e < cookie.length; ++e) {
          if (cookie[e].includes(`f${end_needle}`) || cookie[e].includes(`b${end_needle}`)) {
            endN = true;
            break find_endN;
          }
        }
      }
      cookie_dir === '+' ? (findEndNeedle(XrightN), (end_needle = XrightN)) : (findEndNeedle(XleftN), (end_needle = XleftN));
      if (!endN) {
        cookie.push(`miss ${cookie_dir} f${end_needle} ${cookie_carrier}`);
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
    // } //?
  }
  if (!warning) {
    for (let i = r; i < r + xfer_row_interval; ++i) {
      for (let p = 0; p < rows[i].length; ++p) {
        cookie = rows[i][p];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers, p);
        if (xtype === 'inc') {
          if (right_xfer) {
            if (RtwistedF) {
              // if (RtwistedF && cookie.includes(`f${Xright_needle - 1} `) && !cookie.includes(`b${Xright_needle - 1} `)) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`f${Xright_needle - 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  RtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // RtwistedF = false;
            }
            if (RtwistedB) {
              // if (RtwistedB && cookie.includes(`b${Xright_needle - 1} `) && !cookie.includes(`f${Xright_needle - 1} `)) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`b${Xright_needle - 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  RtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // RtwistedB = false;
            }
          }
          if (left_xfer) {
            if (LtwistedF) {
              // if (LtwistedF && cookie.includes(`f${Xleft_needle + 1} `) && !cookie.includes(`b${Xleft_needle + 1} `)) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`f${Xleft_needle + 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  LtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // LtwistedF = false;
            }
            if (LtwistedB) {
              // if (LtwistedB && cookie.includes(`b${Xleft_needle + 1} `) && !cookie.includes(`f${Xleft_needle + 1} `)) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`b${Xleft_needle + 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  LtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // LtwistedB = false;
            }
          }
        }
        // if (xtype === 'inc' && p === 0) {
        //   for (let b = 0; b < bg_needles.length; ++b) {
        //     cookie = cookie.map((el) => {
        //       if (el.includes(`f${bg_needles[b]} `) || el.includes(`b${bg_needles[b]} `)) {
        //         if (el.includes('+')) {
        //           return (el = el.replace('+', '-'));
        //         } else if (el.includes('-')) {
        //           return (el = el.replace('-', '+'));
        //         }
        //       } else {
        //         return el;
        //       }
        //     });
        //   }
        //   bg_needles = [];
        // }
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
        if (xtype === 'inc') {
          if (right_xfer) {
            if (RtwistedF) {
              // if (RtwistedF && cookie.includes(`f${Xright_needle - 1} `) && !cookie.includes(`b${Xright_needle - 1} `)) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`f${Xright_needle - 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  RtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // RtwistedF = false;
            }
            if (RtwistedB) {
              // if (RtwistedB && cookie.includes(`b${Xright_needle - 1} `) && !cookie.includes(`f${Xright_needle - 1} `)) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`b${Xright_needle - 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  RtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // RtwistedB = false;
            }
          }
          if (left_xfer) {
            if (LtwistedF) {
              // if (LtwistedF && cookie.includes(`f${Xleft_needle + 1} `) && !cookie.includes(`b${Xleft_needle + 1} `)) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`f${Xleft_needle + 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  LtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // LtwistedF = false;
            }
            if (LtwistedB) {
              // if (LtwistedB && cookie.includes(`b${Xleft_needle + 1} `) && !cookie.includes(`f${Xleft_needle + 1} `)) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`b${Xleft_needle + 1} `)) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  LtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes('-')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              // LtwistedB = false;
            }
          }
        }
        // if (xtype === 'inc' && p === 0) {
        //   for (let b = 0; b < bg_needles.length; ++b) {
        //     cookie = cookie.map((el) => {
        //       if (el.includes(`f${bg_needles[b]} `) || el.includes(`b${bg_needles[b]} `)) {
        //         if (el.includes('+')) {
        //           return (el = el.replace('+', '-'));
        //         } else if (el.includes('-')) {
        //           return (el = el.replace('-', '+'));
        //         }
        //       } else {
        //         return el;
        //       }
        //     });
        //   }
        //   bg_needles = [];
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
      if (!warning) {
        console.log(
          chalk.black.bgYellow(`! WARNING:`) + ` The program has finished running through all rows in the custom shape. The rest of the file will maintain the shape's final width.` //TODO: alter this once have function to chop off excess rows
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
        cookie = rows[first_short_row - 1][p];
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
      xfer_section.push(`x-roller-advance 50`); //new
      BINDOFF(short_Xleft_needle - 1, short_Xleft_needle - Xright_needle - 1, 'right', double_bed);
      shaped_rows.push(xfer_section);
      xfer_section = [];
      cookie = rows[first_short_row - 1][bindoff_pass];
      cookieCutter(Xleft_needle, Xright_needle, carriers);
      shaped_rows.push(cookie);
      let out_carriers = false;
      if (carriers.length > 3 && !errors) {
        out_carriers = true;
        carriers = carriers.filter((el) => !short_row_carriers.includes(el));
      }
      ///////////////////////////new
      //TODO: add feature to split up f & b knits of pass if carrier starts in wrong direction (i.e. if carrier on left side & pass = neg, split up into pos b pass then neg front pass)
      new_carriers = [...carriers];
      for (let i = 0; i < final_carrier_pos.length; ++i) {
        //new
        if (final_carrier_pos[i].SIDE === 'right') {
          let carrier_idx = carriers.indexOf(final_carrier_pos[i].CARRIER);
          let replacement_carrier = short_row_carriers.splice(carrier_idx, 1, final_carrier_pos[i].CARRIER);
          new_carriers.splice(carrier_idx, 1, replacement_carrier);
        }
      }
      new_carriers = new_carriers.flat();
      /////////////////////?
      // let left_carriers = []; //go back! //?
      // let right_carriers = [];
      // let left_shortCs = [];
      // let right_shortCs = [];
      // let adjustment;
      // rows[first_short_row - 1][rows[first_short_row - 1].length - 1] !== bindoff_pass ? (adjustment = -1) : (adjustment = 0);
      // for (let i = 0; i < rows[first_short_row - 1].length + adjustment; ++i) {
      //   if (rows[first_short_row - 1][i].some((el) => el.includes(' - '))) {
      //     //new spaces //check
      //     let last_op = rows[first_short_row - 1][i][rows[first_short_row - 1][i].length - 1];
      //     left_carriers.push(last_op.charAt(last_op.length - 1));
      //   } else if (rows[first_short_row - 1][i].some((el) => el.includes('+'))) {
      //     let last_op = rows[first_short_row - 1][i][rows[first_short_row - 1][i].length - 1];
      //     right_carriers.push(last_op.charAt(last_op.length - 1));
      //   }
      // }
      // left_carriers = [...new Set(left_carriers)];
      // right_carriers = [...new Set(right_carriers)];
      // let idxs = [];
      // right_carriers.map((el) => idxs.push(carriers.indexOf(el)));
      // let left_idxs = [];
      // left_carriers.map((el) => left_idxs.push(carriers.indexOf(el)));
      // ////
      // if (out_carriers) {
      //   for (let i = 0; i < final_carrier_pos.length; ++i) {
      //     if (short_row_carriers.includes(final_carrier_pos[i].CARRIER)) {
      //       if (final_carrier_pos[i].SIDE === 'left') {
      //         left_shortCs.push(final_carrier_pos[i].CARRIER);
      //       } else {
      //         right_shortCs.push(final_carrier_pos[i].CARRIER);
      //       }
      //     }
      //   }
      //   function moveCarrier(from, to) {
      //     let f = short_row_carriers.splice(from, 1)[0];
      //     short_row_carriers.splice(to, 0, f);
      //   }
      //   if (left_shortCs.length !== 0 && !left_idxs.includes(-1)) {
      //     for (let i = 0; i < left_shortCs.length; ++i) {
      //       moveCarrier(short_row_carriers.indexOf(left_shortCs[i]), left_idxs[i]);
      //     }
      //   }
      //   if (right_shortCs.length !== 0) {
      //     for (let i = 0; i < right_shortCs.length; ++i) {
      //       if (!idxs.includes(-1)) {
      //         moveCarrier(short_row_carriers.indexOf(right_shortCs[i]), idxs[i]);
      //       } else {
      //         moveCarrier(short_row_carriers.indexOf(right_shortCs[i]), 0);
      //       }
      //     }
      //   }
      // }
      // ////
      // new_carriers = carriers.map((c) => {
      //   if (idxs.includes(carriers.indexOf(c))) {
      //     return (c = short_row_carriers[carriers.indexOf(c)]);
      //   } else {
      //     return c;
      //   }
      // });
      // short_row_carriers = short_row_carriers.map((c) => {
      //   if (idxs.includes(short_row_carriers.indexOf(c))) {
      //     return (c = carriers[short_row_carriers.indexOf(c)]);
      //   } else {
      //     return c;
      //   }
      // });
      //////go back! ^ //?
      /////////////////////
      for (let c = 0; c < new_carriers.length; ++c) {
        if (carriers.includes(new_carriers[c])) {
          redefine_carriers.push([new_carriers[c], short_row_carriers[c]]);
        } else {
          redefine_carriers.push([short_row_carriers[c], new_carriers[c]]);
        }
      }
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
bindoff_time = true;
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
  xfer_section.push(`x-roller-advance 50`); //new need to //check //come back! (reset [TODO: determine if should be 50 or 100])
  BINDOFF(Bxfer_needle, bindoff_count, bindoff_side, double_bed);
  bindoff.push(xfer_section);
  xfer_section = [];
}
bindoff = bindoff.flat();
shaped_rows.push(bindoff);
shaped_rows = shaped_rows.flat();

//----------------
//***ADD IN MISSES
//----------------
// shaped_rows.map((el) => {
//   el.includes(` ${carriers_arr[i]}`) && (el.includes(`knit`) || el.includes(`miss`));
// });

// in_file.forEach((arr) =>
miss: for (let i = 0; i < shaped_rows.length; ++i) {
  if (shaped_rows[i] === `;bindoff section`) {
    break miss;
  }
  if (
    shaped_rows[i].includes('knit + ') &&
    shaped_rows[i + 1].includes('knit - ') &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) < Number(shaped_rows[i + 1].split(' ')[2].slice(1))
  ) {
    // let elN = Number(element.split(' ')[2].slice(1));
    // let next_elN = Number(shaped_rows[shaped_rows.indexOf(element) + 1].split(' ')[2].slice(1));
    shaped_rows.splice(i + 1, 0, `miss + ${shaped_rows[i].split(' ')[2]} ${shaped_rows[i].charAt(shaped_rows[i].length - 1)}`);
  } else if (
    shaped_rows[i].includes('knit - ') &&
    shaped_rows[i + 1].includes('knit + ') &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) > Number(shaped_rows[i + 1].split(' ')[2].slice(1))
  ) {
    shaped_rows.splice(i + 1, 0, `miss - ${shaped_rows[i + 1].split(' ')[2]} ${shaped_rows[i].charAt(shaped_rows[i].length - 1)}`);
  }
}
// shaped_rows.forEach((element) => {
//   if (
//     element.includes('knit + ') &&
//     shaped_rows[shaped_rows.indexOf(element) + 1].includes('knit - ') &&
//     Number(element.split(' ')[2].slice(1)) < Number(shaped_rows[shaped_rows.indexOf(element) + 1].split(' ')[2].slice(1))
//   ) {
//     // let elN = Number(element.split(' ')[2].slice(1));
//     // let next_elN = Number(shaped_rows[shaped_rows.indexOf(element) + 1].split(' ')[2].slice(1));
//     shaped_rows.splice(shaped_rows.indexOf(element), 0, `miss + ${shaped_rows[shaped_rows.indexOf(element) + 1].split(' ')[2]} ${element.charAt(element.length - 1)}`);
//   } else if (
//     element.includes('knit - ') &&
//     shaped_rows[shaped_rows.indexOf(element) + 1].includes('knit + ') &&
//     Number(element.split(' ')[2].slice(1)) > Number(shaped_rows[shaped_rows.indexOf(element) + 1].split(' ')[2].slice(1))
//   ) {
//     console.log(element); //remove
//     if (Number(element.split(' ')[2].slice(1)) === 3) console.log(shaped_rows.indexOf(element)); //remove
//     shaped_rows.splice(shaped_rows.indexOf(element), 0, `miss - ${shaped_rows[shaped_rows.indexOf(element) + 1].split(' ')[2]} ${element.charAt(element.length - 1)}`);
//   }
// });

//----------------------------
//***ADD OUT / OUTHOOK BACK IN
//----------------------------
//TODO: do this for inhook & releasehook for shima
let yarn_out;
sinkers ? (yarn_out = 'outhook') : (yarn_out = 'out');
((carriers_arr) => {
  short_row_section && !sinkers ? (carriers_arr = [...new_carriers, ...short_row_carriers]) : (carriers_arr = carriers);
  // if (!carriers_arr.includes(draw_thread)) carriers_arr.push(draw_thread); //new
  for (let i = 0; i <= carriers_arr.length; ++i) {
    let carrier_search = shaped_rows.map((el) => el.includes(` ${carriers_arr[i]}`) && (el.includes(`knit`) || el.includes(`miss`)));
    let last = carrier_search.lastIndexOf(true);
    if (last !== -1) {
      if (short_row_carriers.includes(carriers_arr[i])) {
        //TODO: check this over
        //new
        let dir;
        let out_spot = Number(shaped_rows[last].split(' ')[2].slice(1)); //?
        shaped_rows[last].includes(' + ') ? ((dir = '+'), (out_spot += 6)) : ((dir = '-'), (out_spot -= 2));
        shaped_rows.splice(last + 1, 0, `miss ${dir} f${out_spot} ${carriers_arr[i]}`); //new
        shaped_rows.push(`$yarn_out ${carriers_arr[i]}`);
        // shaped_rows.splice(last + 1, 0, `${yarn_out} ${carriers_arr[i]}`);
      } else {
        shaped_rows.splice(last + 1, 0, `${yarn_out} ${carriers_arr[i]}`);
      }
    }
  }
  if (!carriers_arr.includes(draw_thread)) shaped_rows.push(`$yarn_out ${draw_thread}`); //new
})();

//-----------------------------------------------------
//***ADD x-vis-color FOR SHORTROW CARRIERS IF NECESSARY
//-----------------------------------------------------
if (short_row_section && !sinkers) {
  for (let i = 0; i < redefine_carriers.length; ++i) {
    let correspond_color = header.find((line) => line.includes(`x-vis-color`) && line.charAt(line.length - 1) === `${redefine_carriers[i][0]}`).split(' ');
    correspond_color = correspond_color[1];
    shaped_rows.splice(shaped_rows.indexOf(`;short row section`) + 1, 0, `x-vis-color ${correspond_color} ${redefine_carriers[i][1]}`);
  }
}
shaped_rows.unshift(header);

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
    // fs.writeFile(`./knit-out-files/${new_file}`, final_file, function (err) {
    //   //remove
    //   if (err) return console.log(err);
    //   console.log(chalk.green(`\nThe knitout file has successfully been altered and saved. The path to the new file is: ${new_file}`));
    // }); //remove
  }
}

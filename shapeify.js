//TODO: deal with situations where only shaping is short rowing (like sweater_front.jpg)
const fs = require('fs');
const readlineSync = require('readline-sync');
const chalk = require('chalk');

let errors = false;
//--------------------------------------------------------------------------------------
//***RUN/GET VARIABLES FROM SHAPE-PROCESSOR.JS OR SHAPE-TEMPLATES.JS, EXTRACT SHAPE INFO
//--------------------------------------------------------------------------------------
console.log(
  chalk`{bgYellow.black.bold WRITING 'SHAPE-CODE.txt' FILE IN WORKING DIRECTORY.\nIf you would like to edit the shape in the .txt file, please do so now.\nValid characters are: 0 }{black.bgYellow [white space] }{bgYellow.black.bold and 1 }{black.bgYellow [shape]}`
); //new
readlineSync.keyInYNStrict(chalk.blue.bold('Are you ready to proceed?')); //new
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
if (fs.existsSync('SHAPE-CODE.txt')) {
  //new
  fs.unlinkSync('SHAPE-CODE.txt');
  console.log('Clearing shape code data...');
}
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
let increasing = false; //new
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
    if (!increasing && (shape_left_inc !== 0 || shape_right_inc !== 0)) increasing = true; //new
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
      if (right_px1 !== code[i].length - 1) {
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
      if (!increasing && (shape_left_inc !== 0 || shape_right_inc !== 0)) increasing = true; //new
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

let stitch_number = 5; //default
let stitch_header = caston_section.find((line) => line.includes(`x-stitch-number`));
if (stitch_header !== undefined) stitch_number = Number(stitch_header.split(' ')[1]);

let speed_number = 100; //default
let speed_header = caston_section.find((line) => line.includes(`x-speed-number`));
if (speed_header !== undefined) speed_number = Number(speed_header.split(' ')[1]);

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

//TODO: make this only for if there are increasing in the shape
// let inc_methods = ['Xfer', 'Twisted-stitch'],
//   inc_method = readlineSync.keyInSelect(inc_methods, chalk.blue.bold(`^Which increasing method would you like to use?`));
// inc_method = inc_methods[inc_method];

let inc_methods;
if (increasing) {
  //new
  (inc_methods = ['Xfer', 'Twisted-stitch']), (inc_method = readlineSync.keyInSelect(inc_methods, chalk.blue.bold(`^Which increasing method would you like to use?`)));
  inc_method = inc_methods[inc_method];
}

let xfer_speed_number = readlineSync.question(
  chalk`{blue.bold \nWhat carriage speed would you like to use for transfer operations?} {blue.italic (press enter to use default speed, 100.) }`,
  {
    defaultInput: 100,
    limit: Number,
    limitMessage: chalk.red('-- $<lastInput> is not a number.'),
  }
);
xfer_speed_number = Number(xfer_speed_number); //new

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
// console.log(short_row_carriers, carriers); //FIXME: //remove

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
  // let need_to_drop = []; //new
  ////
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
      ////
      if (n_count <= row1_Rneedle) {
        //new
        kniterate_caston.push(line.join(' '));
      } else {
        continue yarnsin;
      }
      ////
      // if (n_count > row1_Rneedle && !need_to_drop.includes(n_count)) {
      //   //new
      //   need_to_drop.push(n_count);
      // }
      // kniterate_caston.push(line.join(' '));
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
  // if (need_to_drop.length > 0) {
  //   for (let d = need_to_drop.length - 1; d >= 0; --d) {
  //     kniterate_caston.push(`drop b${need_to_drop[d]}`);
  //   }
  //   for (let d = 0; d < need_to_drop.length; ++d) {
  //     kniterate_caston.push(`drop f${need_to_drop[d]}`);
  //   }
  // }
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

final_carrier_pos.push(
  CARRIER_PARK({
    CARRIER: draw_thread, //could be altered in draw_thread is used in main body section too
    SIDE: 'right',
    ROW: 0, //to indicate waste yarn section
    IDX: 0,
  })
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
    if (type === `x-speed-number` || type === `x-stitch-number` || type === `x-roller-advance` || type === `x-add-roller-advance` || type === `rack`) {
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
      if (rows.length < first_short_row - 1) {
        //new -1
        //TODO: check whether it should be <=
        let side;
        // pass_check[pass_check.length - 1].DIR === '+' ? (side = 'right') : (side = 'left');
        dir === '+' ? (side = 'right') : (side = 'left'); //new //TODO: determine if rest of code counts from 0 or 1 for rows
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
// console.log(final_carrier_pos); //remove
// console.log(first_short_row); //remove

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

//--------------------------
//***PROTO BIND-OFF FUNCTION
//--------------------------
let left_bindC, right_bindC; //new moved here
let insertLl8r, insertRl8r;
insertLl8r = insertRl8r = false; //new
let insertl8r_arr = [];
let bindoff_carrier;
let bindoff_time = false;
let short_tail = [];
const BINDOFF = (xfer_needle, count, side, double_bed, xfer_section) => {
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
        xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
      }
      if (op === 'bind') {
        if (x === xfer_needle + count - 1 && bindoff_time) {
          break pos;
        }
        ////
        xfer_section.push(`xfer b${x} f${x}`);
        xfer_section.push(`rack -1`);
        xfer_section.push(`xfer f${x} b${x + 1}`);
        xfer_section.push(`rack 0`);
        if (x !== xfer_needle) {
          xfer_section.push(`x-add-roller-advance -50`); //new
          xfer_section.push(`drop b${x - 1}`); //new
        }
        xfer_section.push(`knit + b${x + 1} ${bindoff_carrier}`);
        if (x < xfer_needle + count - 2) xfer_section.push(`tuck - b${x} ${bindoff_carrier}`); //new
        if (bindoff_time && x === xfer_needle) xfer_section.push(`drop b${xfer_needle - 1}`); //new need to //check
      }
    }
  };
  const negLoop = (op, bed) => {
    neg: for (let x = xfer_needle + count - 1; x >= xfer_needle; --x) {
      if (op === 'knit') {
        xfer_section.push(`knit - ${bed}${x} ${bindoff_carrier}`);
      }
      if (op === 'xfer') {
        let receive;
        bed === 'f' ? (receive = 'b') : (receive = 'f');
        xfer_section.push(`xfer ${bed}${x} ${receive}${x}`);
      }
      if (op === 'bind') {
        if (x === xfer_needle && bindoff_time) {
          break neg;
        }
        /////////////
        xfer_section.push(`xfer b${x} f${x}`);
        xfer_section.push(`rack 1`);
        xfer_section.push(`xfer f${x} b${x - 1}`);
        xfer_section.push(`rack 0`);
        if (x !== xfer_needle + count - 1) {
          xfer_section.push(`x-add-roller-advance -50`); //new
          xfer_section.push(`drop b${x + 1}`); //newest
        }
        xfer_section.push(`knit - b${x - 1} ${bindoff_carrier}`);
        if (x > xfer_needle + 1) xfer_section.push(`tuck + b${x} ${bindoff_carrier}`); //new
        if (bindoff_time && x === xfer_needle + count - 1) xfer_section.push(`drop b${xfer_needle + count}`); //new need to //check
      }
    }
  };
  /////
  const bindoffTail = (last_needle, dir, xfer_section) => {
    //TODO: check over that skip_some doesn't mess up non-shortrow tails
    let skip_some = false; //new
    if (short_tail.length > 0) skip_some = true;
    let otherT_dir, miss1, miss2;
    dir === '+' ? ((otherT_dir = '-'), (miss1 = last_needle + 1), (miss2 = last_needle - 1)) : ((otherT_dir = '+'), (miss1 = last_needle - 1), (miss2 = last_needle + 1));
    if (!skip_some) {
      xfer_section.push(`;tail`); //new //come back! and //check
      if (short_row_section) {
        xfer_section.push(`x-roller-advance 100`);
      } else {
        xfer_section.push(`x-roller-advance 200`);
      }
      //new
      xfer_section.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
    } else {
      xfer_section.splice(xfer_section.indexOf(`insert here`), 1, `miss ${dir} b${miss1} ${bindoff_carrier}`);
    }
    for (let i = 0; i < 6; ++i) {
      if (!skip_some) {
        //new
        xfer_section.push(`knit ${otherT_dir} b${last_needle} ${bindoff_carrier}`);
        xfer_section.push(`miss ${otherT_dir} b${miss2} ${bindoff_carrier}`);
        xfer_section.push(`knit ${dir} b${last_needle} ${bindoff_carrier}`);
        xfer_section.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
        if (short_row_section) {
          if (i === 0) xfer_section.push(`insert here`); //put miss here
          xfer_section.push(`insert here`);
        }
        // if (i === 0) xfer_section.push(`x-stitch-number 4`); //TODO: make these based on stitch number (add variable; detect from header [so this would be stitch_number - 1])
      } else {
        xfer_section.splice(
          xfer_section.indexOf(`insert here`),
          1,
          `knit ${otherT_dir} b${last_needle} ${bindoff_carrier}`,
          `miss ${otherT_dir} b${miss2} ${bindoff_carrier}`,
          `knit ${dir} b${last_needle} ${bindoff_carrier}`,
          `miss ${dir} b${miss1} ${bindoff_carrier}`
        );
      }
    }
    if (!skip_some) xfer_section.push(`x-add-roller-advance 200`); //TODO: maybe make this 100 for shortrow?
    xfer_section.push(`drop b${last_needle}`);
  };
  //////
  if (side === 'left') {
    if (bindoff_time) {
      // xfer_section.push(`x-stitch-number 4`); //new //TODO: remove right
      posLoop('knit', 'f');
      if (double_bed) negLoop('knit', 'b');
    }
    posLoop('xfer', 'f');
    // if (bindoff_time) {
    //   if (double_bed) posLoop('knit', 'b');
    //   negLoop('knit', 'b');
    //   xfer_section.push(`x-stitch-number 3`);
    // }
    xfer_section.push(`x-roller-advance 50`); //new
    xfer_section.push(`x-add-roller-advance -50`); //new //check
    if (bindoff_time) xfer_section.push(`tuck - b${xfer_needle - 1} ${bindoff_carrier}`); //new good!!!!!!!!!!!
    xfer_section.push(`knit + b${xfer_needle} ${bindoff_carrier}`); //new
    posLoop('bind', null);
    if (bindoff_time) {
      if (short_row_section) {
        bindoffTail(xfer_needle + count - 1, '+', short_tail);
      } else {
        bindoffTail(xfer_needle + count - 1, '+', xfer_section);
      }
    }
  } else if (side === 'right') {
    if (bindoff_time) {
      negLoop('knit', 'f');
      if (double_bed) posLoop('knit', 'b');
    }
    negLoop('xfer', 'f');
    xfer_section.push(`x-roller-advance 50`); //new
    xfer_section.push(`x-add-roller-advance -50`); //new //check
    if (bindoff_time) xfer_section.push(`tuck + b${xfer_needle + count} ${bindoff_carrier}`); //new good!!!!!!
    xfer_section.push(`knit - b${xfer_needle + count - 1} ${bindoff_carrier}`); //new
    // xfer_section.push(`miss + b${xfer_needle + count - 1} ${bindoff_carrier}`); //new //TODO: maybe make this tuck if miss doesn't work well
    negLoop('bind', null);
    if (bindoff_time) {
      if (short_row_section) {
        bindoffTail(xfer_needle, '-', short_tail);
      } else {
        bindoffTail(xfer_needle, '-', xfer_section);
      }
    }
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

let LtwistedF, LtwistedB, RtwistedF, RtwistedB, twist;
const inc1DoubleBed = (Xside_needle, side) => {
  //TODO: make this work for more than one inc
  if (side === 'left') {
    if (inc_method === 'Xfer') {
      //new
      xfer_section.push(`rack -1`);
      xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
      xfer_section.push(`rack 0`);
      xfer_section.push(`x-add-roller-advance -100`); //new
      xfer_section.push(`miss + f${Xside_needle} ${left_bindC}`); //TODO: check to see if this ensures the order
      xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`); //new order
      // xfer_section.push(`rack 0`); //TODO: check to see if this ensures the order
      xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 1}`);
      // xfer_section.push(`xfer f${Xside_needle - 1} b${Xside_needle - 1}`);
      // xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`);
      xfer_section.push(`rack -1`);
      xfer_section.push(`xfer b${Xside_needle} f${Xside_needle - 1}`);
      twist = 1; //new
    } else {
      twist = 0;
    }
    LtwistedF = true;
    LtwistedB = true;
  } else if (side === 'right') {
    if (inc_method === 'Xfer') {
      //new
      xfer_section.push(`rack 1`);
      xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
      xfer_section.push(`rack 0`);
      xfer_section.push(`x-add-roller-advance -100`); //new
      xfer_section.push(`miss - f${Xside_needle} ${right_bindC}`); //TODO: check to see if this ensures the order
      xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`); //new order
      // xfer_section.push(`rack 0`); //TODO: check to see if this ensures the order
      xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 1}`);
      // xfer_section.push(`xfer f${Xside_needle + 1} b${Xside_needle + 1}`);
      // xfer_section.push(`xfer f${Xside_needle} b${Xside_needle}`);
      xfer_section.push(`rack 1`);
      xfer_section.push(`xfer b${Xside_needle} f${Xside_needle + 1}`);
      twist = 1;
    } else {
      twist = 0;
    }
    RtwistedF = true;
    RtwistedB = true;
  } else if (side === 'both') {
    //new
    LtwistedF = true;
    LtwistedB = true;
    RtwistedF = true;
    RtwistedB = true;
    twist = 0;
  }
  xfer_section.push(`rack 0`);
};

const inc2DoubleBed = (Xside_needle, side) => {
  if (side === 'left') {
    if (inc_method === 'Xfer') {
      //new
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
      twist = 1;
    } else {
      twist = 0;
    }
    LtwistedF = true;
    LtwistedB = true;
  } else if (side === 'right') {
    if (inc_method === 'Xfer') {
      //new
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
      twist = 1;
    } else {
      twist = 0;
    }
    RtwistedF = true;
    RtwistedB = true;
    // } else if (side === 'both') {
    //   //TODO: make sure this works for 2 needles
    //   //new
    //   LtwistedF = true;
    //   LtwistedB = true;
    //   RtwistedF = true;
    //   RtwistedB = true;
    //   twist = 0;
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

// let left_bindC, right_bindC; //new moved
function insertXferPasses(left, right, xtype) {
  // xfer_section.push(`x-speed-number 100`); //new //temporary //remove
  xfer_section.push(`x-speed-number ${xfer_speed_number}`);
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
      // if (!insertRl8r && !insertLl8r) xfer_section.push(`;dec ${stitches1} on ${side1}`);
      xfer_section.push(`;dec ${stitches1} on ${side1}`);
      if (stitches1 === 1) {
        dec1DoubleBed(xfer_needle1, side1);
      } else if (stitches1 === 2) {
        dec2DoubleBed(xfer_needle1, side1);
      } else {
        side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC);
        if ((side === 'right' && insertRl8r) || (side !== 'right' && insertLl8r)) {
          insertl8r_arr.push(`x-speed-number ${xfer_speed_number}`); //new
          insertl8r_arr.push(xfer_section.pop()); //new
          BINDOFF(xfer_needle1, stitches1, side1, true, insertl8r_arr);
          insertl8r_arr.push(`x-speed-number ${speed_number}`); //new
        } else {
          BINDOFF(xfer_needle1, stitches1, side1, true, xfer_section);
        }
      }
      if (side === 'both') {
        // if (!insertRl8r) xfer_section.push(`;dec ${stitches2} on right`);
        xfer_section.push(`;dec ${stitches2} on right`);
        if (stitches2 === 1) {
          dec1DoubleBed(xfer_needle2, 'right');
        } else if (stitches2 === 2) {
          dec2DoubleBed(xfer_needle2, 'right');
        } else {
          bindoff_carrier = right_bindC;
          if (insertRl8r) {
            insertl8r_arr.push(`x-speed-number ${xfer_speed_number}`); //new
            insertl8r_arr.push(xfer_section.pop()); //new
            BINDOFF(xfer_needle2, stitches2, 'right', true, insertl8r_arr);
            insertl8r_arr.push(`x-speed-number ${speed_number}`); //new
          } else {
            BINDOFF(xfer_needle2, stitches2, 'right', true, xfer_section);
          }
        }
      }
    } else {
      // xfer_section.push(`;inc ${stitches1} on ${side1}`);
      xfer_section.push(`;inc ${stitches1} on ${side1}`);
      // if (side === 'both') xfer_section.push(`;inc ${stitches2} on right`);
      if (stitches1 === 1) {
        if (side === 'both') xfer_section.push(`;inc ${stitches2} on right`);
        inc1DoubleBed(xfer_needle1, side);
        // inc1DoubleBed(xfer_needle1, side1);
      } else if (stitches1 === 2) {
        // inc2DoubleBed(xfer_needle1, side);
        inc2DoubleBed(xfer_needle1, side1);
        if (side === 'both') {
          //new
          xfer_section.push(`;inc ${stitches2} on right`);
          inc2DoubleBed(xfer_needle2, 'right');
        }
      } else {
        side === 'right' ? (bindoff_carrier = right_bindC) : (bindoff_carrier = left_bindC);
        incMultDoubleBed(xfer_needle1, stitches1, side1);
        if (side === 'both') {
          //new
          bindoff_carrier = right_bindC;
          incMultDoubleBed(xfer_needle2, stitches2, 'right');
        }
      }
      // if (side === 'both') {
      //   xfer_section.push(`;inc ${stitches2} on right`);
      //   if (stitches2 === 1) {
      //     inc1DoubleBed(xfer_needle2, 'right');
      //   } else if (stitches2 === 2) {
      //     inc2DoubleBed(xfer_needle2, 'right');
      //   } else {
      //     bindoff_carrier = right_bindC;
      //     incMultDoubleBed(xfer_needle2, stitches2, 'right');
      //   }
      // }
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
        BINDOFF(xfer_needle1, stitches1, side1, false, xfer_section);
        if (side === 'both') {
          xfer_section.push(`;dec ${stitches2} on right`);
          bindoff_carrier = right_bindC;
          BINDOFF(xfer_needle2, stitches2, 'right', false, xfer_section);
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
  xfer_section.push(`x-speed-number ${speed_number}`); //new //temporary //remove
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
// let new_carriers = []; ////for when swap carriers during shortrowing (kniterate)
let new_carriers = [...carriers]; //new spot
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
let xtra_yarn = [];
// let back_passLneg = [];
let back_passLpos = []; //new
let back_passRneg = []; //new
// let back_passRpos = [];
///////
for (let r = xfer_row_interval; r < rows.length; r += xfer_row_interval) {
  xtype = undefined; ////reset for now in case no xfers
  if (r !== 0) {
    insertLl8r = insertRl8r = true;
    left_bindC = right_bindC = rows[r][0][rows[r][0].length - 1].charAt(rows[r][0][rows[r][0].length - 1].length - 1); //new //check
    for (let i = 0; i < rows[r - 1].length; ++i) {
      if (rows[r - 1][i].some((el) => el.includes(' - '))) {
        let last_op = rows[r - 1][i][rows[r - 1][i].length - 1];
        left_bindC = last_op.charAt(last_op.length - 1);
        insertLl8r = false; //new
      } else if (rows[r - 1][i].some((el) => el.includes(' + '))) {
        let last_op = rows[r - 1][i][rows[r - 1][i].length - 1];
        right_bindC = last_op.charAt(last_op.length - 1);
        insertRl8r = false; //new
      }
    }
    ////
  } else {
    xfer_row_interval = shaping_arr[0].ROW;
  }
  if (shape_code_reverse !== null && !warning) {
    if (!shortrow_time) {
      parseShape(shaping_arr, r);
    } else {
      if (!new_carriers.includes(left_bindC)) {
        left_bindC = new_carriers[short_row_carriers.indexOf(left_bindC)];
      }
      if (!new_carriers.includes(right_bindC)) {
        right_bindC = new_carriers[short_row_carriers.indexOf(right_bindC)];
      }
      // left_bindC = new_carriers[carriers.indexOf(left_bindC)];
      // right_bindC = new_carriers[carriers.indexOf(right_bindC)];
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
        cookie.push(`miss ${cookie_dir} f${end_needle} ${cookie_carrier}`); //go back!
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
        if (shortrow_time && back_passLpos.length > 0) {
          for (let c = 0; c < back_passLpos.length; ++c) {
            if (
              i === back_passLpos[c][0] &&
              (rows[i][p][0].charAt(rows[i][p][0].length - 1) === back_passLpos[c][1] ||
                rows[i][p][0].charAt(rows[i][p][0].length - 1) === short_row_carriers[new_carriers.indexOf(back_passLpos[c][1])])
            ) {
              shaped_rows.push(`;back pass`); //remove
              // console.log(`;back pass!`); //remove
              let mod = 4;
              if (back_passLpos[c][2] === 1) mod = 5;
              if (back_passLpos[c][2] === 2) mod = 3;
              for (let n = Xleft_needle; n <= Xright_needle; ++n) {
                if (n === Xleft_needle || n === Xright_needle) {
                  shaped_rows.push(`knit + b${n} ${back_passLpos[c][1]}`);
                } else if (n % mod === 0) {
                  shaped_rows.push(`knit + b${n} ${back_passLpos[c][1]}`);
                }
              }
              back_passLpos.splice(c, 1);
            }
          }
        }
        cookie = rows[i][p];
        cookieCutter(Xleft_needle, Xright_needle, new_carriers, p);
        if (xtype === 'inc') {
          if (right_xfer) {
            if (RtwistedF) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`f${Xright_needle - twist} `) && RtwistedF) {
                  //new
                  // if (el.includes(`f${Xright_needle - 1} `) && RtwistedF) {
                  RtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!RtwistedF) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
            if (RtwistedB) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`b${Xright_needle - twist} `) && RtwistedB) {
                  //new
                  // if (el.includes(`b${Xright_needle - 1} `) && RtwistedB) {
                  RtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!RtwistedB) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
          }
          if (left_xfer) {
            if (LtwistedF) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`f${Xleft_needle + twist} `) && LtwistedF) {
                  // if (twist === 0) console.log(el); //FIXME: //remove
                  // if (el.includes(`f${Xleft_needle + 1} `) && LtwistedF) {
                  LtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!LtwistedF) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
            if (LtwistedB) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`b${Xleft_needle + twist} `) && LtwistedB) {
                  // if (twist === 0) console.log(el); //FIXME: //remove
                  // if (el.includes(`b${Xleft_needle + 1} `) && LtwistedB) {
                  LtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!LtwistedB) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
          }
        }

        //////
        // shaped_rows.push(cookie);
        if (p === 0 && insertl8r_arr.length > 0) {
          // console.log(insertl8r_arr); //remove
          if (insertLl8r) {
            cookieCutter(Xleft_needle - left_xfer_count, Xright_needle, new_carriers, p);
            // console.log(cookie); //remove
          } else if (insertRl8r) {
            cookieCutter(Xleft_needle, Xright_needle + right_xfer_count, new_carriers, p);
            // console.log(cookie); //remove
          }
          //new
          shaped_rows.push(cookie, insertl8r_arr);
          insertl8r_arr = [];
        } else {
          shaped_rows.push(cookie);
        }
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
    break; //new
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
      // for (let c = 0; c < carriers.length; ++c) {
      for (let c = 0; c < new_carriers.length; ++c) {
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
        if (back_passRneg.length > 0) {
          for (let c = 0; c < back_passRneg.length; ++c) {
            if (
              i === back_passRneg[c][0] &&
              (rows[i][p][0].charAt(rows[i][p][0].length - 1) === back_passRneg[c][1] ||
                rows[i][p][0].charAt(rows[i][p][0].length - 1) === new_carriers[short_row_carriers.indexOf(back_passRneg[c][1])])
            ) {
              insert_arr.push(`;back pass`); //remove
              // console.log(`;back pass!`); //remove
              let mod = 3;
              if (back_passRneg[c][2] === 1) mod = 5;
              if (back_passRneg[c][2] === 2) mod = 4;
              for (let n = short_Xright_needle; n >= short_Xleft_needle; --n) {
                if (n === short_Xright_needle || n === short_Xleft_needle) {
                  insert_arr.push(`knit - b${n} ${back_passRneg[c][1]}`);
                } else if (n % mod === 0) {
                  insert_arr.push(`knit - b${n} ${back_passRneg[c][1]}`);
                }
              }
              back_passLpos.splice(c, 1);
            }
          }
        }
        cookie = rows[i][p];
        cookieCutter(short_Xleft_needle, short_Xright_needle, short_row_carriers, p);
        if (xtype === 'inc') {
          if (right_xfer) {
            if (RtwistedF) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`f${Xright_needle - twist} `) && RtwistedF) {
                  // if (el.includes(`f${Xright_needle - 1} `) && RtwistedF) {
                  RtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!RtwistedF) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
            if (RtwistedB) {
              //for right inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`b${Xright_needle - twist} `) && RtwistedB) {
                  // if (el.includes(`b${Xright_needle - 1} `) && RtwistedB) {
                  RtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!RtwistedB) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
          }
          if (left_xfer) {
            if (LtwistedF) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`f${Xleft_needle + twist} `) && LtwistedF) {
                  // if (el.includes(`f${Xleft_needle + 1} `) && LtwistedF) {
                  LtwistedF = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!LtwistedF) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
            if (LtwistedB) {
              //for left inc
              cookie = cookie.map((el) => {
                if (el.includes(`knit`) && el.includes(`b${Xleft_needle + twist} `) && LtwistedB) {
                  // if (el.includes(`b${Xleft_needle + 1} `) && LtwistedB) {
                  cookie.unshift(`x-roller-advance 50`); //new //?
                  cookie.push(`x-roller-advance 100`); //new //?
                  LtwistedB = false;
                  if (el.includes('+')) {
                    return (el = el.replace('+', '-'));
                  } else if (el.includes(' - ')) {
                    return (el = el.replace('-', '+'));
                  }
                } else {
                  return el;
                }
              });
              if (!LtwistedB) {
                cookie.unshift(`x-roller-advance 50`); //new
                cookie.push(`x-roller-advance 100`); //new
              }
            }
          }
        }
        // insert_arr.push(cookie);
        if (p === 0 && insertl8r_arr.length > 0) {
          if (insertLl8r) {
            // console.log(cookie); //remove
            cookieCutter(short_Xleft_needle - left_xfer_count, short_Xright_needle, short_row_carriers, p);
          } else if (insertRl8r) {
            // console.log(cookie); //remove
            cookieCutter(short_Xleft_needle, short_Xright_needle + right_xfer_count, short_row_carriers, p);
          }
          //new
          insert_arr.push(cookie, insertl8r_arr);
          insertl8r_arr = [];
        } else {
          insert_arr.push(cookie);
        }
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
      let bind_chosen = false; //new
      // console.log(final_carrier_pos); //FIXME: //remove
      bindoffC: for (let p = rows[first_short_row - 1].length - 1; p >= 0; --p) {
        // if (rows[first_short_row - 1][p].some((el) => el.includes(` - `))
        if (rows[first_short_row - 1][p].some((el) => el.includes(` - `)) && !bind_chosen) {
          bind_chosen = true; //new
          final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE = 'left'; //new
          bindoff_pass = p; ////keeps redefining until end, so ends up being final match
          continue bindoffC; //new //check
          // break bindoffC; //go back!
        } else if (bind_chosen) {
          ////new
          if (rows[first_short_row - 1][p].some((el) => el.includes(` - `))) {
            final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE = 'left'; //new
          } else if (rows[first_short_row - 1][p].some((el) => el.includes(` + `))) {
            final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE =
              'right'; //new
          }
          ////
          // final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE =
          //   'right'; //new //go back! //?
        }
      }
      // console.log(final_carrier_pos); //FIXME: //remove
      // for (let p = 0; p < rows[first_short_row - 1].length; ++p) {
      //   // if (rows[first_short_row - 1][p].some((el) => el.includes(` - `))
      //   if (rows[first_short_row - 1][p].some((el) => el.includes(` - `))) {
      //     console.log(rows[first_short_row - 1][p][0]); //remove
      //     console.log(rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1)); //remove
      //     console.log(final_carrier_pos[final_carrier_pos.indexOf((el) => el.CARRIER == rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))]);
      //     final_carrier_pos[final_carrier_pos.indexOf((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE = 'left'; //new
      //     bindoff_pass = p; ////keeps redefining until end, so ends up being final match
      //   } else {
      //     console.log(final_carrier_pos[final_carrier_pos.indexOf((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))]); //remove
      //     final_carrier_pos[final_carrier_pos.indexOf((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE = 'right'; //new
      //   }
      // }
      shaped_rows.push(`;short row section`);
      ////moved down
      // for (let p = 0; p < bindoff_pass; ++p) {
      //   cookie = rows[first_short_row - 1][p];
      //   cookieCutter(Xleft_needle, Xright_needle, carriers, null);
      //   shaped_rows.push(cookie);
      // }
      // //////
      // short_Xleft_needle = shortrow_bindoff[1];
      // short_Xright_needle = Xright_needle;
      // Xright_needle = shortrow_bindoff[0];
      // /////
      // cookie = rows[first_short_row - 1][bindoff_pass];
      // cookieCutter(short_Xleft_needle, short_Xright_needle, carriers);
      // shaped_rows.push(cookie);
      // bindoff_carrier = cookie[cookie.length - 1].charAt(cookie[cookie.length - 1].length - 1);
      // xfer_section.push(`x-roller-advance 50`);
      // BINDOFF(short_Xleft_needle - 1, short_Xleft_needle - Xright_needle - 1, 'right', double_bed);
      // shaped_rows.push(xfer_section);
      // xfer_section = [];
      // cookie = rows[first_short_row - 1][bindoff_pass];
      // cookieCutter(Xleft_needle, Xright_needle, carriers);
      // shaped_rows.push(cookie);
      //////new location before
      let push_draw = false; //new
      if (!carriers.includes(draw_thread) && !new_carriers.includes(draw_thread)) {
        push_draw = true; //new
        // if (!new_carriers.includes(draw_thread)) {

        //go back! //?
        // new_carriers.push(draw_thread);
        // short_row_carriers.splice(short_row_carriers.indexOf(draw_thread), 1);
      }
      let out_carriers = false;
      if (carriers.length > 3 && !errors) {
        out_carriers = true;
        // new_carriers = new_carriers.filter((el) => !short_row_carriers.includes(el)); //check
        carriers = carriers.filter((el) => !short_row_carriers.includes(el));
      }
      ///////////////////////////new
      //TODO: add feature to split up f & b knits of pass if carrier starts in wrong direction (i.e. if carrier on left side & pass = neg, split up into pos b pass then neg front pass)
      new_carriers = [...carriers]; //TODO: make sure this doesn't get messed up for
      if (push_draw) {
        //new
        new_carriers.push(draw_thread);
        short_row_carriers.splice(short_row_carriers.indexOf(draw_thread), 1);
        // } else {
        //   xtra_carriers.push(draw_thread); //new
      }
      // console.log('carriers are:', new_carriers, short_row_carriers); //FIXME: //remove
      // if (!carriers.includes(draw_thread) && !new_carriers.includes(draw_thread)) {
      //   // if (!new_carriers.includes(draw_thread)) {
      //   //go back! //?
      //   new_carriers.push(draw_thread);
      //   short_row_carriers.splice(short_row_carriers.indexOf(draw_thread), 1);
      // }
      // console.log(final_carrier_pos); //remove
      // console.log(draw_thread); //remove
      // console.log(short_row_carriers); //remove
      for (let i = 0; i < final_carrier_pos.length; ++i) {
        //new
        if (final_carrier_pos[i].SIDE === 'right' && new_carriers.includes(final_carrier_pos[i].CARRIER)) {
          //new
          // if (final_carrier_pos[i].SIDE === 'right') {
          // let carrier_idx = carriers.indexOf(final_carrier_pos[i].CARRIER);
          let carrier_idx = new_carriers.indexOf(final_carrier_pos[i].CARRIER);
          let replacement_carrier = short_row_carriers.splice(carrier_idx, 1, final_carrier_pos[i].CARRIER);
          new_carriers.splice(carrier_idx, 1, replacement_carrier);
        }
      }
      new_carriers = new_carriers.flat();
      // console.log(new_carriers); //remove
      // console.log(short_row_carriers); //remove
      if (new_carriers.length > short_row_carriers.length) {
        even_out: for (let c = new_carriers.length - 1; c >= 0; --c) {
          if (!carriers.includes(new_carriers[c])) {
            // console.log(c, new_carriers[c]); //remove
            let move = new_carriers.splice(c, 1);
            // console.log(move); //remove
            short_row_carriers.push(move);
            break even_out;
          }
        }
        short_row_carriers = short_row_carriers.flat();
      }
      /////new
      // console.log(`new_carriers: ${new_carriers}, short_row_carriers: ${short_row_carriers}`); //FIXME: //remove
      if (short_row_carriers.length > 3) {
        //new //come back!
        let splice_start = 6 - short_row_carriers.length;
        short_row_carriers.splice(splice_start, short_row_carriers.length - splice_start);
        new_carriers.splice(splice_start, new_carriers.length - splice_start);
      }
      // console.log(`new_carriers: ${new_carriers}, short_row_carriers: ${short_row_carriers}`); //FIXME: //remove
      //////
      // let all_carriers = [...short_row_carriers, ...new_carriers];
      // console.log(all_carriers); //remove
      // all_carriers = all_carriers.flat();
      // for (let c = 0; c < all_carriers.length; ++c) {
      //   if (!final_carrier_pos.some(el => el)) {}
      // }
      // console.log(new_carriers); //remove
      // console.log(short_row_carriers); //remove
      ///////////////
      //TODO: add in something similar for if more than 3 carriers ARE used in body (but only 3 in shortrowsection so OK), to make it so if it ends up on left, add in extra pass to make it end up on right
      for (let c = 0; c < short_row_carriers.length; ++c) {
        if (xtra_carriers.includes(short_row_carriers[c]) && !xtra_yarn.includes(short_row_carriers[c])) {
          // if (!carriers.includes(short_row_carriers[c]) && short_row_carriers[c] !== draw_thread && !xtra_yarn.includes(short_row_carriers[c])) {
          xtra_yarn.push(short_row_carriers[c]); //here
        }
      }
      // console.log(`xtra_yarn: ${xtra_yarn}`); //FIXME: //remove
      /////////moved
      // let bp_count = 3; //new
      // let bp_carriers = [];
      for (let p = 0; p < bindoff_pass; ++p) {
        cookie = rows[first_short_row - 1][p];
        cookieCutter(Xleft_needle, Xright_needle, carriers, null);
        shaped_rows.push(cookie);
        // /////new
        // let c = rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1); //new
        // if (!bp_carriers.includes(c)) bp_carriers.push(c); //new
        // console.log(c); //remove
        // if (rows[first_short_row - 1][p].some((el) => el.includes(` - `)) && !new_carriers.includes(c)) {
        //   console.log(`bp!`); //FIXME: //remove
        //   shaped_rows.push(`;backpass`); //new
        //   // let mod = 3 + bp_count;
        //   // ++bp_count;
        //   for (let n = Xleft_needle; n <= Xright_needle; ++n) {
        //     if (n === Xleft_needle || n === Xright_needle) {
        //       shaped_rows.push(`knit + b${n} ${c}`);
        //     } else if (n % bp_count === 0) {
        //       shaped_rows.push(`knit + b${n} ${c}`);
        //     }
        //   }
        //   ++bp_count;
        //   // final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE = 'left'; //new
        // } else if (rows[first_short_row - 1][p].some((el) => el.includes(` + `)) && !short_row_carriers.includes(c)) {
        //   console.log(`bp!`); //FIXME: //remove
        //   shaped_rows.push(`;backpass`); //new
        //   // let mod = 3 + bp_count;
        //   // ++bp_count;
        //   for (let n = Xright_needle; n >= Xleft_needle; --n) {
        //     if (n === Xright_needle || n === Xleft_needle) {
        //       shaped_rows.push(`knit - b${n} ${c}`);
        //     } else if (n % bp_count === 0) {
        //       shaped_rows.push(`knit - b${n} ${c}`);
        //     }
        //   }
        //   ++bp_count;
        //   // final_carrier_pos[final_carrier_pos.findIndex((el) => el.CARRIER === rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1))].SIDE = 'right'; //new
        // }
        ///////
      }
      let bp_count = 3; //new
      for (let c = 0; c < final_carrier_pos.length; ++c) {
        if (new_carriers.includes(final_carrier_pos[c].CARRIER) && final_carrier_pos[c].SIDE === 'right') {
          // console.log(`bp! new carriers`); //FIXME: //remove
          shaped_rows.push(`;backpass`); //new
          for (let n = Xright_needle; n >= Xleft_needle; --n) {
            if (n === Xright_needle || n === Xleft_needle) {
              shaped_rows.push(`knit - b${n} ${final_carrier_pos[c].CARRIER}`);
            } else if (n % bp_count === 0) {
              shaped_rows.push(`knit - b${n} ${final_carrier_pos[c].CARRIER}`);
            }
          }
          ++bp_count;
        } else if (short_row_carriers.includes(final_carrier_pos[c].CARRIER) && final_carrier_pos[c].SIDE === 'left') {
          // console.log(`bp! short row carriers`); //FIXME: //remove
          shaped_rows.push(`;backpass`); //new
          for (let n = Xleft_needle; n <= Xright_needle; ++n) {
            if (n === Xleft_needle || n === Xright_needle) {
              shaped_rows.push(`knit + b${n} ${c}`);
            } else if (n % bp_count === 0) {
              shaped_rows.push(`knit + b${n} ${c}`);
            }
          }
          ++bp_count;
        }
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
      xfer_section.push(`x-speed-number ${xfer_speed_number}`); //new
      xfer_section.push(`x-roller-advance 50`);
      BINDOFF(short_Xleft_needle - 1, short_Xleft_needle - Xright_needle - 1, 'right', double_bed, xfer_section);
      xfer_section.push(`x-speed-number ${speed_number}`);
      shaped_rows.push(xfer_section);
      xfer_section = [];
      cookie = rows[first_short_row - 1][bindoff_pass];
      cookieCutter(Xleft_needle, Xright_needle, carriers);
      shaped_rows.push(cookie);
      /////////////////////?
      let left_carriers = []; //go back! //?
      let right_carriers = [];
      // let left_shortCs = [];
      // let right_shortCs = [];
      // let adjustment;
      // rows[first_short_row - 1][rows[first_short_row - 1].length - 1] !== bindoff_pass ? (adjustment = -1) : (adjustment = 0);
      // console.log(rows[first_short_row - 1]); //remove
      // console.log(rows[first_short_row]); //remove
      // console.log(adjustment); //remove
      /////////////////////////////
      find_dir: for (let y = first_short_row - 1; y < rows.length; ++y) {
        // find_dir: for (let y = first_short_row; y < rows.length; ++y) {
        if (left_carriers.length + right_carriers.length === new_carriers.length) break find_dir;
        parse_pass: for (let i = 0; i < rows[y].length; ++i) {
          if (y === first_short_row - 1 && bindoff_pass > i) continue parse_pass; //new
          if (rows[y][i].some((el) => el.includes(' - '))) {
            let last_op = rows[y][i][rows[y][i].length - 1];
            if (!left_carriers.includes(last_op.charAt(last_op.length - 1)) && !right_carriers.includes(last_op.charAt(last_op.length - 1))) {
              if (new_carriers.includes(last_op.charAt(last_op.length - 1))) {
                back_passLpos.push([y, last_op.charAt(last_op.length - 1), back_passLpos.length]);
              } else {
                back_passLpos.push([y, new_carriers[short_row_carriers.indexOf(last_op.charAt(last_op.length - 1))], back_passLpos.length]);
              }
              left_carriers.push(last_op.charAt(last_op.length - 1));
            }
          } else if (rows[y][i].some((el) => el.includes(' + '))) {
            let last_op = rows[y][i][rows[y][i].length - 1];
            if (!left_carriers.includes(last_op.charAt(last_op.length - 1)) && !right_carriers.includes(last_op.charAt(last_op.length - 1))) {
              if (short_row_carriers.includes(last_op.charAt(last_op.length - 1))) {
                back_passRneg.push([y, last_op.charAt(last_op.length - 1), back_passRneg.length]); //here
              } else {
                back_passRneg.push([y, short_row_carriers[new_carriers.indexOf(last_op.charAt(last_op.length - 1))], back_passRneg.length]);
              }
              ////
              right_carriers.push(last_op.charAt(last_op.length - 1));
            }
          }
        }
      }
      ////////////////////////
      // find_dir: for (let y = first_short_row; y < rows.length; ++y) {
      //   if (left_carriers.length + right_carriers.length === new_carriers.length) break find_dir;
      //   for (let i = 0; i < rows[y].length; ++i) {
      //     if (rows[y][i].some((el) => el.includes(' - '))) {
      //       let last_op = rows[y][i][rows[y][i].length - 1];
      //       if (!left_carriers.includes(last_op.charAt(last_op.length - 1)) && !right_carriers.includes(last_op.charAt(last_op.length - 1))) {
      //         if (new_carriers.includes(last_op.charAt(last_op.length - 1))) {
      //           back_passLpos.push([y, last_op.charAt(last_op.length - 1), back_passLpos.length]);
      //         } else {
      //           back_passLpos.push([y, new_carriers[short_row_carriers.indexOf(last_op.charAt(last_op.length - 1))], back_passLpos.length]);
      //         }
      //         left_carriers.push(last_op.charAt(last_op.length - 1));
      //       }
      //     } else if (rows[y][i].some((el) => el.includes(' + '))) {
      //       let last_op = rows[y][i][rows[y][i].length - 1];
      //                   // if (!left_carriers.includes(last_op.charAt(last_op.length - 1)) && !right_carriers.includes(last_op.charAt(last_op.length - 1))) {

      //       if (!left_carriers.includes(last_op.charAt(last_op.length - 1)) && !right_carriers.includes(last_op.charAt(last_op.length - 1))) {
      //       // if (
      //       //   (!left_carriers.includes(last_op.charAt(last_op.length - 1)) && !right_carriers.includes(last_op.charAt(last_op.length - 1))) ||
      //       //   (!carriers.includes(last_op.charAt(last_op.length - 1)) && last_op.charAt(last_op.length - 1) !== draw_thread) //new //check
      //       // ) {
      //         if (short_row_carriers.includes(last_op.charAt(last_op.length - 1))) {
      //           back_passRneg.push([y, last_op.charAt(last_op.length - 1), back_passRneg.length]); //here
      //         } else {
      //           back_passRneg.push([y, short_row_carriers[new_carriers.indexOf(last_op.charAt(last_op.length - 1))], back_passRneg.length]);
      //         }
      //         ////
      //         right_carriers.push(last_op.charAt(last_op.length - 1)); //go back! //?
      //       }
      //       // if (
      //       //   short_row_carriers.includes(last_op.charAt(last_op.length - 1)) &&
      //       //   !carriers.includes(last_op.charAt(last_op.length - 1)) &&
      //       //   last_op.charAt(last_op.length - 1) !== draw_thread
      //       // ) {
      //       //   //new
      //       // }
      //     }
      //   }
      // }
      // console.log(`left_carriers = ${left_carriers}`); //FIXME: //remove
      // console.log(`right_carriers = ${right_carriers}`); //FIXME: //remove
      // console.log(back_passRneg); //remove
      // console.log(back_passLpos); //remove
      //////////////////////
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
      // console.log(redefine_carriers); //remove
      ///////
      /////
      if (rows[first_short_row - 1][rows[first_short_row - 1].length - 1] !== rows[first_short_row - 1][bindoff_pass]) {
        ////
        for (let p = bindoff_pass + 1; p < rows[first_short_row - 1].length; ++p) {
          if (back_passLpos.length > 0) {
            for (let c = 0; c < back_passLpos.length; ++c) {
              if (
                first_short_row - 1 === back_passLpos[c][0] &&
                (rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1) === back_passLpos[c][1] ||
                  rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1) === short_row_carriers[new_carriers.indexOf(back_passLpos[c][1])])
              ) {
                shaped_rows.push(`;back pass`);
                let mod = 4;
                if (back_passLpos[c][2] === 1) mod = 5;
                if (back_passLpos[c][2] === 2) mod = 3;
                for (let n = Xleft_needle; n <= Xright_needle; ++n) {
                  if (n === Xleft_needle || n === Xright_needle) {
                    shaped_rows.push(`knit + b${n} ${back_passLpos[c][1]}`);
                  } else if (n % mod === 0) {
                    shaped_rows.push(`knit + b${n} ${back_passLpos[c][1]}`);
                  }
                }
                back_passLpos.splice(c, 1);
              }
            }
          }
          //////
          cookie = rows[first_short_row - 1][p];
          cookieCutter(Xleft_needle, Xright_needle, new_carriers);
          shaped_rows.push(cookie);
          /////
          if (back_passRneg.length > 0) {
            for (let c = 0; c < back_passRneg.length; ++c) {
              if (
                first_short_row - 1 === back_passRneg[c][0] &&
                (rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1) === back_passRneg[c][1] ||
                  rows[first_short_row - 1][p][0].charAt(rows[first_short_row - 1][p][0].length - 1) === new_carriers[short_row_carriers.indexOf(back_passRneg[c][1])])
              ) {
                insert_arr.push(`;back pass`); //remove
                let mod = 3;
                if (back_passRneg[c][2] === 1) mod = 5;
                if (back_passRneg[c][2] === 2) mod = 4;
                for (let n = short_Xright_needle; n >= short_Xleft_needle; --n) {
                  if (n === short_Xright_needle || n === short_Xleft_needle) {
                    insert_arr.push(`knit - b${n} ${back_passRneg[c][1]}`);
                  } else if (n % mod === 0) {
                    insert_arr.push(`knit - b${n} ${back_passRneg[c][1]}`);
                  }
                }
                back_passLpos.splice(c, 1);
              }
            }
          }
          cookie = rows[first_short_row - 1][rows[first_short_row - 1].length - 1];
          cookieCutter(short_Xleft_needle, short_Xright_needle, short_row_carriers);
          insert_arr.push(cookie);
        }
        ///
        // if (rows[first_short_row - 1][rows[first_short_row - 1].length - 1] !== bindoff_pass) { //go back! //?
        // cookie = rows[first_short_row - 1][rows[first_short_row - 1].length - 1];
        // cookieCutter(Xleft_needle, Xright_needle, new_carriers);
        // shaped_rows.push(cookie);
        /////
        /////
        // cookie = rows[first_short_row - 1][rows[first_short_row - 1].length - 1];
        // cookieCutter(short_Xleft_needle, short_Xright_needle, short_row_carriers);
        // insert_arr.push(cookie);
      }
      xfer_row_interval = first_short_row - r;
      //////
    }
  }
  //////
  if (!short_row_section && r + xfer_row_interval > shaping_arr[shaping_arr.length - 1].ROW) {
    //new
    warning = true;
    // break;
  }
  if (rows[r + xfer_row_interval + xfer_row_interval] === undefined) {
    //////////////////////////
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
let bindCs = []; //new
last_carrier: for (let i = shaped_rows.length - 1; i > 0; --i) {
  if (shaped_rows[i].includes('knit')) {
    bindoff_carrier = shaped_rows[i].charAt(shaped_rows[i].length - 1);
    bindCs.push(bindoff_carrier); //new
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
xfer_section.push(`x-speed-number 100`, `x-roller-advance 100`); //new x=roller-advance
// xfer_section.push(`x-speed-number ${xfer_speed_number}`); //new //temporary //remove
BINDOFF(Bxfer_needle, bindoff_count, bindoff_side, double_bed, xfer_section);
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
    bindCs.push(bindoff_carrier); //new
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
  xfer_section.push(`x-roller-advance 50`); //new need to //check //come back! (reset [TODO: determine if should be 50 or 100]) //go back!
  BINDOFF(Bxfer_needle, bindoff_count, bindoff_side, double_bed, xfer_section);
  bindoff.push(xfer_section);
  xfer_section = [];
  bindoff.push(short_tail); //new
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

let last_carrier_spot = [];
const LastSPOT = ({ CARRIER, SideN, DIR }) => ({
  CARRIER,
  SideN,
  DIR, //new
});

let spotDirLine; //remove
// let tracking = []; //go back! //?
let curr_carrier, spot, spot_dir, carrier_idx, end_needle, end_dir;
// let spot, right;
// let trackN = false;
if (increasing) {
  //remove //TODO: finish this!!!!
  inc_miss: for (let i = shaped_rows.indexOf(';bindoff section'); i >= 0; --i) {
    // inc_miss: for (let i = shaped_rows.length - 1; i >= 0; --i) {
    let op_arr = shaped_rows[i].split(' ');
    let type = op_arr[0];
    if (
      type.includes(';') ||
      // type.includes('out') ||
      // type === `x-speed-number` ||
      // type === `x-stitch-number` ||
      // type === `x-roller-advance` ||
      // type === `x-add-roller-advance` ||
      // type === `rack` ||
      // type === 'xfer' ||
      // type === 'drop' ||
      op_arr.length < 4
    ) {
      continue inc_miss;
    }
    ////new
    let prev_op_arr, next_op_arr, temp_curr, temp_next;
    // if (i !== shaped_rows.length - 1) {
    find_prev: for (let o = i + 1; o < shaped_rows.indexOf(';bindoff section'); ++o) {
      if (shaped_rows[o].includes('knit') && !shaped_rows[o].includes(';')) {
        prev_op_arr = shaped_rows[o].split(' '); //new
        break find_prev;
      }
    }
    // } else {
    if (prev_op_arr === undefined) {
      prev_op_arr = [...op_arr]; //new
      // console.log(`prev_op_arr = ${prev_op_arr}`); //remove
    }
    find_next: for (let o = i - 1; o >= 0; --o) {
      if (o < 0) break inc_miss; //new
      // if (o < 0) break find_next; //new
      if (shaped_rows[o].includes('knit') && !shaped_rows[o].includes(';')) {
        if (next_op_arr === undefined) {
          next_op_arr = shaped_rows[o].split(' ');
          if (spot_dir === undefined && next_op_arr[1] === op_arr[1]) {
            spot_dir = op_arr[1];
            spotDirLine = op_arr; //remove
            break find_next;
          }
        }
        if (spot_dir === undefined) {
          // if (next_op_arr[1] === op_arr[1]) {
          //   spot_dir = op_arr[1];
          //   break find_next;
          // } else {
          //   temp_curr = shaped_rows[o].split(' '); //new
          // }
          // } else {
          //   break find_next;
          // }
          // }
          // } else {
          temp_curr = shaped_rows[o].split(' ');
          temp_next: for (let t = o - 1; t >= 0; --t) {
            // if (t < 0) break inc_miss; //new
            if (shaped_rows[o].includes('knit') && !shaped_rows[o].includes(';')) {
              temp_next = shaped_rows[t].split(' ');
              break temp_next;
            }
          }
          if (temp_next === undefined) break inc_miss; //new
          // }
          // console.log(`temp_curr = ${temp_curr}, ${shaped_rows[o]}`); //remove
          if (temp_curr[1] === temp_next[1]) {
            spotDirLine = temp_curr; //remove
            spot_dir = temp_curr[1]; //new //fixed
            break find_next;
          }
          // break find_next;
        }
      }
    }
    ////
    if (curr_carrier === undefined) {
      curr_carrier = op_arr[3];
      // if (op_arr[1] === '+') {
      //   last_carrier_spot.push(
      //     LastSPOT({
      //       CARRIER: curr_carrier,
      //       SideN: Number(op_arr[1].slice(1)),
      //     })
      //   );
      // } else {
      // }
    } else {
      if (op_arr[3] !== curr_carrier || (op_arr[3] === curr_carrier && prev_op_arr[1] !== op_arr[1] && prev_op_arr[1] !== next_op_arr[1])) {
        // if (op_arr[3] !== curr_carrier || (op_arr[3] === curr_carrier && op_arr[1] !== end_dir && type !== 'miss' && !shaped_rows[i - 1].includes(`miss ${end_dir}`))) {
        // if (op_arr[3] !== curr_carrier || (op_arr[3] === curr_carrier && (shaped_rows[i+1].includes('knit') || shaped_rows[i+1].includes('miss')) && op_arr[1] !== shaped_rows[i+1].split(' ')[1] && !shaped_rows[i - 1].includes(`miss ${shaped_rows[i+1].split(' ')[1]}`))) {
        // if (op_arr[3] !== curr_carrier) {
        ////
        // spot = i + 1; //new //go back! //?
        // last_needle = Number(op_arr[2].slice(1)); //new //go back! //?
        ////
        // carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER == op_arr[3]);
        // shaped_rows.splice(i + 1, 0, `miss + f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here

        // let carrier, needle;
        // if (trackN) {
        //   carrier = neg_info[0];
        //   needle = neg_info[1];
        //   trackN = false;
        //   neg_info = [];
        // }
        // if (op_arr[1] === '+') {
        //   carrier = curr_carrier;
        //   needle = Number(op_arr[1].slice(1));
        // } else {
        //   trackN = true;
        // }
        // if (carrier !== undefined) {
        carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER === curr_carrier); //new
        // carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER === tracking[0]); //go back! //?
        // let carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER == tracking[0]);
        ///
        // if (tracking[2] === '+' && last_carrier_spot[carrier_idx].SideN > tracking[1]) {
        //   shaped_rows.splice(i, 0, `miss + f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
        // } else if (tracking[2] === '-' && last_carrier_spot[carrier_idx].SideN > tracking[1]) {
        //   shaped_rows.splice(i, 0, `miss - f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
        // }
        ///
        // let curr_carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER == curr_carrier);
        if (carrier_idx === -1) {
          last_carrier_spot.push(
            LastSPOT({
              CARRIER: curr_carrier,
              // CARRIER: tracking[0],
              SideN: Number(prev_op_arr[2].slice(1)), //check !!!
              // SideN: tracking[1],
              DIR: spot_dir, //new
              // DIR: undefined, //new
            })
          );
          // spot_dir = undefined;
        } else {
          if (last_carrier_spot[carrier_idx].DIR === spot_dir) {
            console.log(`backpass!!!!!, ${shaped_rows[spot - 1]}, ${spotDirLine}`); //new //remove
            shaped_rows.splice(spot, 0, `;ERROR: backpass needed :( 0`); //come back! //&& replace this with an actual backpass
          }
          ////
          if (spot !== undefined) {
            if (spot_dir === '+' && last_carrier_spot[carrier_idx].SideN > end_needle) {
              shaped_rows.splice(spot, 0, `miss + f${last_carrier_spot[carrier_idx].SideN} ${curr_carrier} ;here`); //come back! && //remove ;here
            } else if (spot_dir === '-' && last_carrier_spot[carrier_idx].SideN < end_needle) {
              //new > ==> <
              shaped_rows.splice(spot, 0, `miss - f${last_carrier_spot[carrier_idx].SideN} ${curr_carrier} ;here`); //come back! && //remove ;here
            }
            // spot = i + 1; //new
          }
          spot = i + 1; //reset
          end_needle = Number(op_arr[2].slice(1)); //reset
          ////
          last_carrier_spot[carrier_idx].SideN = Number(prev_op_arr[2].slice(1)); //check
          // last_carrier_spot[carrier_idx].SideN = tracking[1];
          last_carrier_spot[carrier_idx].DIR = spot_dir; //new
          // spot_dir = undefined;
          // last_carrier_spot[carrier_idx].DIR = tracking[2]; //new
        }
        // if (tracking[2] === '+' && last_carrier_spot[carrier_idx].SideN > tracking[1]) {
        //   shaped_rows.splice(spot, 0, `miss + f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
        //   // shaped_rows.splice(i + 1, 0, `miss + f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
        // } else if (tracking[2] === '-' && last_carrier_spot[carrier_idx].SideN < tracking[1]) {
        //   //  shaped_rows.splice(i + 1, 0, `miss - f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
        // }
        // last_carrier_spot[carrier_idx].SideN = tracking[1];
        // }
        // }
        spot_dir = undefined; //new
        curr_carrier = op_arr[3];
        // tracking = []; //go back! //?
      }
    }
    // if (tracking.length === 0) {//go back! //?
    // end_dir = op_arr[1];
    // tracking.push(curr_carrier, Number(op_arr[2].slice(1)));
    // // spot = i - 1;
    // // right = Number(op_arr[2].slice(1));
    // if (type === 'knit' && shaped_rows[i - 1].includes('knit')) {
    //   tracking.push(op_arr[1]);
    //   ////new
    //   carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER === tracking[0]);
    //   if (carrier_idx !== -1) {
    //     // if (last_carrier_spot[carrier_idx].DIR === tracking[2]) { //go back! //?
    //     //remove //?
    //     // console.log(last_carrier_spot[carrier_idx]); //remove
    //     // console.log(shaped_rows[i], shaped_rows[i - 1]); //remove
    //     // shaped_rows.splice(spot, 0, `;ERROR: backpass needed :( 0`);
    //     // console.log(`backpass!!! 0`); //remove
    //     // }
    //     // last_carrier_spot[carrier_idx].DIR = tracking[2]; //go back! //?
    //     ///
    //     if (tracking[2] === '+' && last_carrier_spot[carrier_idx].SideN > last_needle) {
    //       shaped_rows.splice(spot, 0, `miss + f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
    //     } else if (tracking[2] === '-' && last_carrier_spot[carrier_idx].SideN < tracking[1]) {
    //       //new > ==> <
    //       shaped_rows.splice(spot, 0, `miss - f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
    //     }
    //   } else {
    //     last_carrier_spot.push(
    //       //new //?
    //       LastSPOT({
    //         CARRIER: tracking[0],
    //         SideN: undefined,
    //         DIR: tracking[2],
    //       })
    //     );
    //   }
    /////
    // if (op_arr[1] === '+') spot = i - 1;
    // }
    // , op_arr[1]);
    // } else { //go back! //?
    //   if (tracking.length === 2) {
    //     tracking[1] = Number(op_arr[2].slice(1));
    //     if (type === 'knit' && shaped_rows[i - 1].includes('knit')) {
    //       tracking.push(op_arr[1]);
    //       /////new
    //       carrier_idx = last_carrier_spot.findIndex((el) => el.CARRIER == tracking[0]);
    //       if (carrier_idx !== -1) {
    //         if (last_carrier_spot[carrier_idx].DIR === tracking[2]) {
    //           //remove //?
    //           console.log(last_carrier_spot[carrier_idx]); //remove
    //           console.log(tracking[2]); //remove
    //           shaped_rows.splice(spot, 0, `;ERROR: backpass needed :( 2`);
    //           console.log(`backpass!!! 2`); //remove
    //         }
    //         last_carrier_spot[carrier_idx].DIR = tracking[2]; //new
    //         ///
    //         if (tracking[2] === '+' && last_carrier_spot[carrier_idx].SideN > last_needle) {
    //           shaped_rows.splice(spot, 0, `miss + f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
    //         } else if (tracking[2] === '-' && last_carrier_spot[carrier_idx].SideN < tracking[1]) {
    //           //new > ==> <
    //           shaped_rows.splice(spot, 0, `miss - f${last_carrier_spot[carrier_idx].SideN} ${tracking[0]} ;here`); //come back! && //remove ;here
    //         }
    //       } else {
    //         last_carrier_spot.push(
    //           //new //?
    //           LastSPOT({
    //             CARRIER: tracking[0],
    //             SideN: undefined,
    //             DIR: tracking[2],
    //           })
    //         );
    //       }
    //       /////
    //       // if (op_arr[1] === '+') spot = i - 1;
    //     }
    //   } else {
    //     tracking[1] = Number(op_arr[2].slice(1));
    //     // if (tracking[2] === '-') tracking[1] = Number(op_arr[2].slice(1));
    //     // if (tracking[2] === '+' && tracking[1] !== right) tracking[1] = right;
    //   }
    //   // tracking[1] = Number(op_arr[2].slice(1));
    // }
    // }
  }
} //remove
// console.log(last_carrier_spot); //remove

let short_miss = false; //new
miss: for (let i = 0; i < shaped_rows.length; ++i) {
  if (shaped_rows[i] === `;bindoff section`) {
    break miss;
  } else if (shaped_rows[i] === `;short row section`) {
    //new
    short_miss = true;
  }
  /////
  let next = i + 1; //new
  if (shaped_rows[i].includes('knit')) {
    //new
    next_knit: for (let p = i + 1; p < shaped_rows.length; ++p) {
      if (
        short_miss &&
        ((new_carriers.includes(shaped_rows[i].charAt(shaped_rows[i].length - 1)) && !new_carriers.includes(shaped_rows[p].charAt(shaped_rows[p].length - 1))) ||
          (short_row_carriers.includes(shaped_rows[i].charAt(shaped_rows[i].length - 1)) && !short_row_carriers.includes(shaped_rows[p].charAt(shaped_rows[p].length - 1))))
      ) {
        ++next;
        continue next_knit;
      } //new
      if (shaped_rows[p].includes('knit')) {
        break next_knit;
      } else if (shaped_rows[p].includes('x-') || shaped_rows[p].includes(';')) {
        ++next;
      }
    }
  }
  // if (i > 0) {
  //   if (
  //     shaped_rows[i - 1].includes('miss') &&
  //     shaped_rows[i].charAt(shaped_rows[i].length - 1) === shaped_rows[i - 1].charAt(shaped_rows[i - 1].length - 1) &&
  //     shaped_rows[i - 1].split(' ')[1] !== shaped_rows[i].split(' ')[1] &&
  //     shaped_rows[i].split(' ')[1] !== shaped_rows[i + 1].split(' ')[1]
  //   ) {
  //     ++i;
  //     console.log('here'); //remove
  //     shaped_rows.splice(i + 1, 0, ';here'); //remove
  //     continue miss;
  //   }
  // }
  ///////////
  // if (
  //   shaped_rows[i].includes('knit + ') &&
  //   shaped_rows[next].includes('knit - ') &&
  //   Number(shaped_rows[i].split(' ')[2].slice(1)) < Number(shaped_rows[next].split(' ')[2].slice(1))
  // ) {
  if (
    shaped_rows[i].includes('knit + ') &&
    shaped_rows[next].includes('knit - ') &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) < Number(shaped_rows[next].split(' ')[2].slice(1)) &&
    Number(shaped_rows[next].split(' ')[2].slice(1)) - Number(shaped_rows[i].split(' ')[2].slice(1)) <= 4 //TODO: maybe move this in brackets, & add else knit [instead of miss]
  ) {
    /////
    shaped_rows.splice(i + 1, 0, `miss + ${shaped_rows[next].split(' ')[2]} ${shaped_rows[i].charAt(shaped_rows[i].length - 1)}; & here`); //remove
    // shaped_rows.splice(i + 1, 0, `miss + ${shaped_rows[next].split(' ')[2]} ${shaped_rows[i].charAt(shaped_rows[i].length - 1)}`); //go back!
    // } else if (
    //   shaped_rows[i].includes('knit - ') &&
    //   shaped_rows[next].includes('knit + ') &&
    //   Number(shaped_rows[i].split(' ')[2].slice(1)) > Number(shaped_rows[next].split(' ')[2].slice(1))
    // ) {
  } else if (
    shaped_rows[i].includes('knit - ') &&
    shaped_rows[next].includes('knit + ') &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) > Number(shaped_rows[next].split(' ')[2].slice(1)) &&
    Number(shaped_rows[i].split(' ')[2].slice(1)) - Number(shaped_rows[next].split(' ')[2].slice(1)) <= 4
  ) {
    shaped_rows.splice(i + 1, 0, `miss - ${shaped_rows[next].split(' ')[2]} ${shaped_rows[i].charAt(shaped_rows[i].length - 1)}`);
  }
}

//----------------------------
//***ADD OUT / OUTHOOK BACK IN
//----------------------------
if (xtra_yarn.length > 0) {
  //new
  for (let y = 0; y < xtra_yarn.length; ++y) {
    let last_knit;
    let pos_pass = []; //new
    let stop = false; //new
    xtra: for (let x = shaped_rows.indexOf(`in ${xtra_yarn[y]}`) + 1; x < shaped_rows.indexOf(`;kniterate yarns in`); ++x) {
      if (!stop && shaped_rows[x].includes(` + `)) {
        //new
        pos_pass.push(shaped_rows[x]);
      } else {
        stop = true;
      }
      if (shaped_rows[x].charAt(shaped_rows[x].length - 1) === `${xtra_yarn[y]}`) {
        last_knit = x;
      } else {
        break xtra;
      }
    }
    // let shift = 0;
    // let b;
    console.log(last_knit, pos_pass); //remove
    shaped_rows.splice(last_knit + 1, 0, pos_pass).flat(); //new
    // for (let n = 1; n <= 20; ++n) {
    //   n % 2 === 0 ? (b = 'b') : (b = 'f');
    //   shaped_rows.splice(last_knit + 1 + shift, 0, `knit + ${b}${n} ${xtra_yarn[y]}`);
    //   ++shift;
    // }
    // if (R_NEEDLE + 4 <= 252) {
    //   //new
    //   shaped_rows.splice(last_knit + 1 + shift, 0, `miss + b${R_NEEDLE + 4} ${xtra_yarn[y]}`);
    // }
  }
}
//TODO: do this for inhook & releasehook for shima
let yarn_out;
// let out_carriers = []; //new
sinkers ? (yarn_out = 'outhook') : (yarn_out = 'out');

((carriers_arr) => {
  short_row_section && !sinkers ? (carriers_arr = [...new_carriers, ...short_row_carriers]) : (carriers_arr = carriers);
  let end_splice = shaped_rows.indexOf(`;tail`); //new //TODO: actually, take them out before knitting tail so less juggling
  // let end_splice = shaped_rows.length; //new //TODO: actually, take them out before knitting tail so less juggling
  // end: for (let i = shaped_rows.length - 1; i > shaped_rows.indexOf(`;bindoff section`); --i) {
  //   if (shaped_rows[i].includes(`drop`)) { //.indexOf(`;tail`)
  //     --end_splice;
  //   } else {
  //     break end;
  //   }
  // }
  for (let i = 0; i <= carriers_arr.length; ++i) {
    let carrier_search = shaped_rows.map((el) => el.includes(` ${carriers_arr[i]}`) && (el.includes(`knit`) || el.includes(`miss`)));
    // let carrier_search = shaped_rows.map((el) => el.includes(` ${carriers_arr[i]}`) && el.includes(`knit`));
    let last = carrier_search.lastIndexOf(true);
    if (last !== -1) {
      // if ((short_row_section && short_row_carriers.includes(carriers_arr[i])) || shaped_rows[last].includes(' - ')) { //new &&
      if ((short_row_section && short_row_carriers.includes(carriers_arr[i])) || shaped_rows[last].includes(' + ')) {
        //new &&
        //new ||
        //TODO: check this over
        //new
        let dir;
        let out_spot = Number(shaped_rows[last].split(' ')[2].slice(1)); //?
        shaped_rows[last].includes(' + ') ? ((dir = '+'), (out_spot += 6)) : ((dir = '-'), (out_spot -= 2));
        shaped_rows.splice(last + 1, 0, `miss ${dir} f${out_spot} ${carriers_arr[i]}`); //new
        // ++end_splice; //new
        if (last + 1 < end_splice) ++end_splice; //new
        // if (carriers_arr[i] !== bindoff_carrier) {
        if (!bindCs.includes(carriers_arr[i])) {
          //new
          shaped_rows.splice(end_splice, 0, `${yarn_out} ${carriers_arr[i]}`); //new
        } else {
          shaped_rows.push(`${yarn_out} ${carriers_arr[i]}`); ////at the end
        }
      } else {
        shaped_rows.splice(last + 1, 0, `${yarn_out} ${carriers_arr[i]}`);
        if (last + 1 < end_splice) ++end_splice; //new
      }
    }
  }
  // if (!carriers_arr.includes(draw_thread)) shaped_rows.push(`$yarn_out ${draw_thread}`); //go back! //?
  if (!carriers_arr.includes(draw_thread)) shaped_rows.splice(end_splice, 0, `${yarn_out} ${draw_thread}`); //new //TODO: maybe add something to check whether it is the bindoff carrier? add what the direction is?
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

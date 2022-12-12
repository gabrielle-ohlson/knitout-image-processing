const MAX_XFER_CT = 2; //TODO: adjust according to code

const helpers = require('./helpers.js');

// class Shaping {
//   constructor(prevN, n, side) {
//     this.prevN = prevN;
//     this.n = n;
//     this.side = side;

//     if (side === 'left') {
//       this.count = prevN-n;
//       this.direction = '+';
//     } else {
//       this.count = n-prevN;
//       this.direction = '-';
//     }

//     if (this.count > 0) this.type = 'increase';
//     else if (this.count < 0) this.type = 'decrease';
//     else this.type = null;
//     // this.type = type;
//     // this.content = content;
//   }

//   toggleDirection() {
//     if (this.direction === '+') this.direction = '-';
//     else this.direction = '+';
//   }
// }

class KnitoutOp {
  constructor(op, insert_idx) {
    this.op = op;
    this.d = undefined;
    this.bn0 = [];
    this.bn = [];
    this.cs = [];
    this.param = undefined; //for when something like header, extension, or rack that thats a different param
    this.comment = undefined;

    this.insert_idx = insert_idx;
    // this.bn = 
  }

  addArgs(key_vals) {
    for (let [key, val] of Object.entries(key_vals)) {
      if (typeof this[key] === Array && typeof val !== Array) this[key].push(val);
      else this[key] = val;
    }
  }

  generateCode(arr) {
    let out = this.op;
    if (this.param) {
      if (typeof this.param === Array) out += ` ${this.param.join(' ')}`;
      else out += ` ${this.param}`;
    } else {
      if (this.d) out += ` ${this.d}`;
      if (this.bn0.length) out += ` ${this.bn0.join('')}`;
      if (this.bn.length) out += ` ${this.bn.join('')}`;
      if (this.cs.length) out += ` ${this.cs.join(' ')}`;
    }
    if (this.comment) out += ` ;${this.comment}`;

    if (arr) {
      if (this.insert_idx) arr.splice(this.insert_idx, 0, out);
      else arr.push(out);
    } else return out;
  }
}

// global:
let sect_track = {};

class Section {
  constructor(idx) {
    this.idx = idx;
    this.edgeNs = {};
    this.parents = [];
    this.carriers = [];
  }
}

class Shaping {
  constructor(type, side, count, prevN, newN, direction) {
    this.type = type;
    this.side = side;
    this.count = count;
    this.prevN = prevN;
    this.newN = newN;
    this.direction = direction;
  }
}


function trackShaping(side, prevN, newN, dict) {
  let count, type;
  if (side === 'left') count = prevN-newN;
  else count = newN-prevN;

  // dict key is the needle to insert the shaping after

  if (count > 0) {
    type = 'increase';
    if (side === 'left') { //insert before
      if (count > MAX_XFER_CT) { //NOTE: multi increase on left side *should always be knitted in the - direction, and start from prevN-1* //NOTE: increases for passes in - direction should *SKIP REST after inc* 
        dict[newN] = new Shaping(type, side, count, prevN-1, newN, '+');
        dict[prevN-1] = new Shaping(type, side, count, prevN-1, newN, '-');
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, '+'); // miss + {bed}{prevN+1} before inc // *knit - to new needle after inc (with twisted stitch, if relevant)* 
        dict[prevN] = new Shaping(type, side, count, prevN, newN, '-'); // miss + {bed}{prevN+1} before inc // then resume *(with twisted stitch, if revelant)*
      }
    } else { // right side
      if (count > MAX_XFER_CT) { //NOTE: multi increase on right side *should always be knitted in the + direction, and start from prevN+1* //NOTE: increases for passes in + direction should *SKIP REST after inc* 
        dict[newN] = new Shaping(type, side, count, prevN+1, newN, '-');
        dict[prevN+1] = new Shaping(type, side, count, prevN+1, newN, '+');
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, '-'); // miss - {bed}{prevN-1} before inc // *knit + to new needle after inc (with twisted stitch, if relevant)*
        dict[prevN] = new Shaping(type, side, count, prevN, newN, '+'); // miss - {bed}{prevN-1} before inc // then resume *(with twisted stitch, if relevant)*
      }
    }
  } else if (count < 0) {
    type = 'decrease'; //TODO: deal with how 
    count = Math.abs(count); //? //TODO: determine if should could keep it like this
    if (side === 'left') {
      if (count > MAX_XFER_CT) { //NOTE: multi decrease on left side *should always be knitted in the + direction, and should not knit through newN during dec*
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // TODO: if direction === '+', insert before and then just resume. if direction === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // hmmm... direction doesn't matter.... // if direction === '-', miss + {bed}{newN+1} before dec
      }
    } else {  // right side
      if (count > MAX_XFER_CT) { //NOTE: multi decrease on right side *should always be knitted in the - direction, and should not knit through newN during dec*
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // TODO: if direction === '-', insert before and then just resume. if direction === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // hmmm... direction doesn't matter.... // if direction === '+', miss - {bed}{newN-1} before dec
      }
    }
  }
}
/*
CONDITIONS FOR NEW PASS:
-----------------------
- carrier changes
- direction changes
*/
function rowsPassesArray(file_content) {
  let file_start = /^(?!;).+/gm.exec(file_content).index;
  let rows_start = /;row:/.exec(file_content).index;
  let bindoff_start = /;bindoff/.exec(file_content).index; //TODO: adjust for when do drop bindoff
  // get all row matches with: file_content2.match(/;row/gm)
  let header_section = file_content.slice(0, file_start);
  let caston_section = file_content.slice(file_start, rows_start);
  let main_section = file_content.slice(rows_start, bindoff_start);
  let bindoff_section = file_content.slice(bindoff_start, -1);

  let rows = main_section.split(/;row:.+\r?\n/).slice(1); //since first will be blank

  if (!rows.length) throw new Error('Input file does not contain the format needed to work with this program.  Please reproduce the file with the "knitify" program.')

  for (let r=0; r<rows.length; ++r) {
    rows[r] = rows[r].split(/\r?\n/);
  }

  return [header_section.split(/\r?\n/), caston_section.split(/\r?\n/), rows, bindoff_section.split(/\r?\n/)];
}


function determineShaping(shape_code) { //TODO: ensure shape_code contains shortrowing
  let sect_idx = 0; //new

  // let rows_sect_cts = []; //remove
  let shaping = [];
  // let working_sect_idxs = [];
  let rows_sect_idxs = [];
  // let sect_track = {}; //new
  let rows_edgeNs = [];

  let prev_edgeNs = {}; //[]; //new dict

  // for (let row_code of shape_code) {
  for (let r=0; r<shape_code.length; ++r) {
    let row_code = shape_code[r];

    let row_shaping = {};
    let row_sect_track = {}; //new
    let row_edgeNs = [];

    let sect_edgeNs = [];

    let sect_ct = 0;
    for (let i=0; i<row_code.length; ++i) {
      let px = row_code[i];
      if (!sect_edgeNs.length && px === 1) { // left needle
        let leftN = i+1; // +1 since first needle is 1

        sect_edgeNs.push(leftN);
      } else if (sect_edgeNs.length === 1) { // right needle
        let rightN;
        if (px === 0) rightN = i; // *not* +1 since we can about the idx before this
        else if (i === row_code.length-1) rightN = i+1;
        else continue;

        sect_edgeNs.push(rightN);
        row_edgeNs.push(sect_edgeNs);

        // if (!working_sect_idxs.length) { // first section
        if (r === 0) {
          sect_track[sect_idx] = new Section(sect_idx); //[r] = sect_edgeNs;

          sect_track[sect_idx].edgeNs[r] = sect_edgeNs;

          row_sect_track[sect_idx] = sect_edgeNs; // keep track on sections in this row
          // working_sect_idxs.push(0);
          // sect_idxs.push(r);
          sect_idx += 1;
        }

        sect_edgeNs = [];

        sect_ct += 1;
      }
    }

    // rows_sect_cts.push(sect_ct); //remove

    // if (prev_edgeNs.length) {
    if (Object.keys(prev_edgeNs).length) {
      let leftover_prev_edgeNs = {...prev_edgeNs}; //[... prev_edgeNs]; // we will find out of there are any prev sections that need to be bound off
      for (let i=0; i<sect_ct; ++i) {
        let leftN = row_edgeNs[i][0];
        let rightN = row_edgeNs[i][1];
        
        let sect_matches = Object.fromEntries(Object.entries(prev_edgeNs).filter(([k,v]) => v[0] <= rightN && v[1] >= leftN)); //new //*

        // let sect_matches = prev_edgeNs.filter(el => el[0] <= rightN && el[1] >= leftN);

        // if (sect_matches.length) { // could be multiple prev sections merging, or just one (if length === 1)
        let match_keys = Object.keys(sect_matches);
        if (match_keys.length) { // could be multiple prev sections merging, or just one (if length === 1)

          // if (match_keys.length === 1) { // just consider this to be a continuation of a prior section
          //   sect_track[]
          // }
          leftover_prev_edgeNs = Object.fromEntries(Object.entries(leftover_prev_edgeNs).filter(([k,v]) => !Object.keys(sect_matches).includes(k))); //new //*
          // for (let s=0; s<sect_matches.length; ++s) {
          for (let s=0; s<match_keys.length; ++s) {
            // leftover_prev_edgeNs = Object.fromEntries(Object.entries(leftover_prev_edgeNs).filter(([k,v]) => !sect_matches.includes(v))); //new //*
            // leftover_prev_edgeNs = leftover_prev_edgeNs.filter(el => !sect_matches.includes(el));
            let prevNs = sect_matches[match_keys[s]]; //new //*
            let prev_leftN = prevNs[0]; //sect_matches[s][0];
            let prev_rightN = prevNs[1]; //sect_matches[s][1];

            if (s === 0) { //TODO: determine if was supposed to be `s` or `i` // if (i === 0) { // no overlapping match before this
              let first_sect = row_code.indexOf(1, prev_leftN)+1; // search for first indication of a section that overlaps with the match

              if (first_sect >= leftN) { // no section before this
                if (match_keys.length === 1) { // just consider this to be a continuation of a prior section
                  sect_track[match_keys[s]].edgeNs[r] = [leftN, rightN];
                  row_sect_track[match_keys[s]] = [leftN, rightN];
                } else { // consider it to be a new section, with "parents"
                  sect_track[sect_idx] = new Section(sect_idx);
                  sect_track[sect_idx].edgeNs[r] = [leftN, rightN];
                  sect_track[sect_idx].parents.push(match_keys[s]); // save this overlapping section as a "parent"
                  row_sect_track[sect_idx] = [leftN, rightN];
                  sect_idx += 1;
                }
                trackShaping('left', prev_leftN, leftN, row_shaping);
              } else { // section before this, track as shaping between that section's right needle+1 (as left needle) and this section's left needle (as right needle)
                trackShaping('left', first_sect, leftN, row_shaping);
              }
            } else { // let's see if there is an increase (merging of two sections)
              sect_track[sect_idx-1].parents.push(match_keys[s]); // save this overlapping section as a "parent"

              let leftN_ = [match_keys[s-1]][1]+1;
              // let leftN_ = sect_matches[s-1][1]+1;
              trackShaping('left', prev_leftN, leftN_, row_shaping);
            }

            if (s === match_keys.length-1) { // no overlapping match after this
              let next_sect = row_code.indexOf(1, rightN); // search for next indication of a section in the current row that overlaps with this match

              if (next_sect === -1 || next_sect >= prev_rightN) { // it doesn't overlap with with the match (note not +1 for idx), so we're good to add the right shaping
                trackShaping('right', prev_rightN, rightN, row_shaping);
              }

              /*
              if (next_sect === -1) { // this is the last section that overlaps with this match
                trackShaping('right', prev_rightN, rightN, row_shaping);
              } else { // another section is coming afterwards, so we are just decreasing based on the needles between the two sections
                trackShaping('right', next_sect, rightN, row_shaping);
              }
              */
            }
          }
        } else { // new section, store it and count its initiation as an increase (really, a caston)
          sect_track[sect_idx] = new Section(sect_idx);
          sect_track[sect_idx].edgeNs[r] = [leftN, rightN];
          row_sect_track[sect_idx] = [leftN, rightN];
          sect_idx += 1;

          let count = rightN-leftN+1; //TODO: make sure everything is ok with +1 for others
          row_shaping[leftN] = new Shaping('increase', 'left', count, rightN, leftN, '+'); //TODO: make this 'caston' instead of 'increase' //?
          row_shaping[rightN] = new Shaping('increase', 'right', count, leftN, rightN, '+');
        }
      }

      if (leftover_prev_edgeNs.length) { // we need to bind these off (do it in preview row)
        for (let edgeNs of leftover_prev_edgeNs) {
          let prev_leftN = edgeNs[0];
          let prev_rightN = edgeNs[1];

          let count = prev_rightN-prev_leftN+1; //TODO: make sure everything is ok with +1 for others

          shaping[shaping.length-1][prev_leftN-1] = new Shaping('bindoff', 'left', count, prev_leftN, prev_rightN, '-');
          shaping[shaping.length-1][prev_rightN+1] = new Shaping('bindoff', 'right', count, prev_rightN, prev_leftN, '+');
        }
      }
    }

    shaping.push(row_shaping);
    prev_edgeNs = row_sect_track; //new //* //row_edgeNs;
    rows_sect_idxs.push(Object.keys(row_sect_track)); //new //*
    rows_edgeNs.push(row_edgeNs);
  }

  return [rows_edgeNs, rows_sect_idxs, sect_track, shaping];
}

// function determineShaping(rows_edgeNs) {
// }

// global variables:

// left and right needles of original piece:
let MIN = Infinity, MAX = -Infinity;
let input_carriers = [];

let specs = {};
let leftover_carriers = [];

// let info_store = {};

let carrier_park = {}; // for tracking the direction of the carriers from the original piece

let carrier_track = {};
let working_needles = {
  'f': [],
  'b': [],
  'fs': [],
  'bs': []
}

let shaping_needles = [];

let twisted_stitches = [];



// increase on left:
// [ ] if d === '+': // miss + {bed}{prevN+1} before inc // *knit - to new needle after inc (with twisted stitch, if relevant)* 
// [ ] if d === '-': // miss + {bed}{prevN+1} before inc // then resume *(with twisted stitch, if revelant)*
// [X] NOTE: multi increase on left side *should always be knitted in the - direction, and start from prevN-1* //NOTE: increases for passes in - direction should *SKIP REST after inc* 

// increase on right:
// [ ] if d === '+': // miss - {bed}{prevN-1} before inc // then resume *(with twisted stitch, if relevant)*
// [ ] if d === '-': // miss - {bed}{prevN-1} before inc // *knit + to new needle after inc (with twisted stitch, if relevant)*
// [X] NOTE: multi increase on right side *should always be knitted in the + direction, and start from prevN+1* //NOTE: increases for passes in + direction should *SKIP REST after inc* 


// decrease on left:
// [ ] hmmm... direction doesn't matter.... // if direction === '-', miss + {bed}{newN+1} before dec
// [ ] NOTE: multi decrease on left side *should always be knitted in the + direction, and should not knit through newN during dec* // TODO: if direction === '+', insert before and then just resume. if direction === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.

// decrease on right:
// [ ] hmmm... direction doesn't matter.... // if direction === '+', miss - {bed}{newN-1} before dec
// [ ] NOTE: multi decrease on right side *should always be knitted in the - direction, and should not knit through newN during dec* // TODO: if direction === '-', insert before and then just resume. if direction === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.


function insertShaping(shaping, carrier, output, row_idx) {
  // let twisted_stitches = [];
  output.push(`;${shaping.type} ${Math.abs(shaping.count)} on ${shaping.side} (${shaping.prevN} => ${shaping.newN})`);
  if (shaping.type === 'increase') {
    if (shaping.count > MAX_XFER_CT) helpers.incMultDoubleBed(shaping.side, shaping.count, shaping.prevN, carrier, output);
    else {
      if (twisted_stitches.length) {
        let requiredNs = [`f${shaping.prevN}`, `b${shaping.prevN}`];

        if (shaping.side === 'left') {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN+1}`, `b${shaping.prevN+1}`);

          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(';twisted stitch !', `miss - ${bn} ${carrier}`, `knit + ${bn} ${carrier}`, `miss - ${bn} ${carrier}`); //TODO: //remove '!'
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        } else {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN-1}`, `b${shaping.prevN-1}`);
          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(';twisted stitch !', `miss + ${bn} ${carrier}`, `knit - ${bn} ${carrier}`, `miss + ${bn} ${carrier}`); //TODO: //remove '!'
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        }
      }

      if (shaping.count === 1) twisted_stitches = twisted_stitches.concat(helpers.inc1DoubleBed(specs, shaping.side, shaping.prevN, carrier, output));
      else if (shaping.count === 2) twisted_stitches = twisted_stitches.concat(helpers.inc2DoubleBed(specs, shaping.side, shaping.prevN, carrier, output));
    }

    /*
    if (shaping.count === 1) helpers.inc1DoubleBed(specs, shaping.prevN, shaping.side, carrier, output);
    else if (shaping.count === 2) helpers.inc2DoubleBed(specs, shaping.prevN, shaping.side, carrier, output);
    else helpers.incMultDoubleBed(shaping.prevN, shaping.count, shaping.side, carrier, output); //TODO: see what direction it is knitting in
    */
  } else if (shaping.type === 'decrease') { //TODO: add temp fix, if necessary, for kniterate
    if (shaping.count > MAX_XFER_CT) helpers.bindoff(specs, shaping.side, shaping.count, shaping.prevN, carrier, output, true, []);
    else helpers.decDoubleBedTempFix(specs, shaping.side, shaping.count, shaping.prevN, output);
    /*
    if (shaping.count === -1) helpers.dec1DoubleBed(specs, shaping.side, output);
    else if (shaping.count === -2) helpers.dec2DoubleBed(specs, shaping.prevN, shaping.side, output);
    else helpers.BINDOFF(MACHINE, shaping.prevN, Math.abs(shaping.count), shaping.side, carrier, true, output);
    */
  } else if (shaping.type === 'bindoff') {
    let off_limits = shaping.side === 'left' ? shaping.prevN-1 : shaping.prevN+1;
    helpers.bindoff(specs, shaping.side, shaping.count, shaping.prevN, carrier, output, false, off_limits);
  }

  let newN_idx = shaping_needles.indexOf(shaping.newN);
  let prevN_idx = shaping_needles.indexOf(shaping.prevN);

  if (newN_idx !== -1) delete shaping_needles[newN_idx];
  if (prevN_idx !== -1) delete shaping_needles[prevN_idx];
  // return twisted_stitches;
}


let yarn_ops = ['in', 'out', 'inhook', 'releasehook', 'outhook'];

function knitoutInfo(ln) {
  let info =  ln.includes(';') ? ln.slice(0, ln.indexOf(';')).trim().split(' ') : ln.trim().split(' ');

  let bn0, bn, d;
  let cs = [];
  let op = info[0];

  // if (!ln.trim().length || ln.trim()[0] === ';') output.push(ln);

  if (op.trim().length && op.trim()[0] !== ';' && op !== 'rack' && !(op.length > 1 && op.slice(0, 2) === 'x-')) {
    // let bn0, bn;
    // let d;
    // let cs = [];
    //TODO: if n === row endN, we assume it was the user's intention to have the carrier miss out of the way, so we can add a miss if no longer ends with the end needle
    if (yarn_ops.includes(op)) cs = info.slice(1);
    else if (op === 'knit' || op === 'tuck' || op === 'miss' || op === 'split') {
      d = info[1];
      if (op === 'split') {
        bn0 = info[2];
        bn = info[3];
        cs = info.slice(4);
      } else {
        bn = info[2];
        cs = info.slice(3);
      }
    } else if (op === 'xfer') {
      bn0 = info[1];
      bn = info[2];
    } else if (op === 'drop')  bn = info[1];
    else throw new Error(`Unrecognized operation: ${op}.`)

    // let b = bn.match(/[a-zA-Z]+/)[0];
    // let n = Number(bn.match(/\d+/)[0]);
  }
  return [op, d, bn0, bn, cs];
}

// function cookieCutter(row, edgeNs, row_shaping, output, row_idx, sect_idx) {
function cookieCutter(row, edgeNs, row_shaping, row_idx, sect_idx) {
  let output = [];
  // let twisted_stitches = [];
  let skip_args = undefined;
  let [leftN, rightN] = edgeNs;

  let k_args = {
    'd': undefined,
    'bn': [],
    'cs': [],
  };

  let in_op;
  let releasehook_op; //TODO: deal with this

  row_loop: for (let r=0; r<row.length; ++r) { //TODO: filter out any extensions/racks that don't work here
    let miss_op;
    let skip = false;
    let iter_output = []; //new //*

    let ln = row[r];
    // if (!ln.trim().length || ln.trim()[0] === ';') output.push(ln);
    let [op, d, bn0, bn, cs] = knitoutInfo(ln);

    if (op === 'in' || op === 'inhook') { //new //* //TODO: also do this for releasehook //TODO: do same for outhook, I guess //?
      in_op = new KnitoutOp(op, output.length-1);
      in_op.addArgs({'cs': cs});
      continue;
    }

    /*
    if (cs.length) {
      let cs_str = ' ' + cs.join(' '); //new //TODO

      for (let c=0; c<cs.length; ++c) {
        if (!input_carriers.includes(cs[c])) { // this carrier is being used for the first time (op should be in or inhook, really)
          input_carriers.push(cs[c]);
        }
        // if (d) OG_carrier_track[cs[c]] = d; // track original carriers
        // cs[c] = parseInt(cs[c]);
        let track_dir = carrier_track[cs[c]];

        if (!track_dir) { // this carrier is being used for the first time (op should be in or inhook, really)
          if (d) { // 

          }
        }
        if (sect_idx == 0) {
          if (!sect_track[sect_idx].carriers.includes(cs[c])) {
            leftover_carriers.splice(leftover_carriers.indexOf(cs[c]), 1); //*
            sect_track[sect_idx].carriers.push(cs[c]);
          }
        } else if (sect_track) {
        } else {
          let carrier;
          let c_idx = sect_track[0].carriers.indexOf(cs[c]);
          if (c_idx > sect_track[sect_idx].carriers.length-1) { // not included in the carriers yet
            if (sect_track[sect_idx].neighbors.length) { // we could get some carriers from here to reuses
              console.log('TODO');
              find_replacement: for (let neighbor of sect_track[sect_idx].neighbors) {
                let replaceC = neighbor.carriers[c_idx];
                if (replaceC) {
                  carrier = replaceC;
                  neighbor.carriers[c_idx] = undefined;
                  break find_replacement;
                }
              }
            } else {
              findC: for (let lc; lc < leftover_carriers.length; ++lc) {
                let track_dir = carrier_track[leftover_carriers[lc]];
                if (track_dir) {
                  if (d) { // this means we want the carrier to 

                  } else if (track_dir === OG_carrier_track[cs[c]]) {
                    carrier = leftover_carriers[lc];
                    break findC;
                  }
                  //
                  // if (d) {
                  //   if (d === track_dir) {
                  //     carrier = leftover_carriers[lc];
                  //     break findC;
                  //   }
                  // } else if (track_dir !== carrier_track[cs[c]]) {
                  //   console.log('TODO: doing this since it should match');
                  // }
                  //
                }
                console.log('TODO');
              }
              if (!carrier) carrier = leftover_carriers.pop(); //*
            }
            sect_track[sect_idx].carriers.push(carrier);
          } else carrier = sect_track[sect_idx].carriers[c_idx];
          cs[c] = carrier; //new //*
        }
        if (d) carrier_track[cs[c]] = d; //new //*
      }

      ln = ln.replace(cs_str, ' ' + cs.join(' ')); // replace with new carriers
    }
    */

    if (!bn) {
      if (yarn_ops.includes(op)) {
        if (op === 'out' || op === 'outhook') { //TODO: replace the carriers for correct section if necessary!
          for (let c of cs) { // TODO: delete these from sect_track carriers *at the end of the row* (of replace with 'undefined' ooh I think that could work //?)
            // delete carrier_track[c];
            let c_idx = sect_track[sect_idx].carriers.indexOf(c);
            sect_track[sect_idx].carriers[c_idx] = undefined; //?
            leftover_carriers.unshift(c); //new //*
          }
        }
      }

      output.push(ln);
    } else {
      if (bn0) {
        let b0 = bn0.match(/[a-zA-Z]+/)[0];
        let n0 = Number(bn.match(/\d+/)[0]);

        if (n0 < leftN || n0 > rightN) continue;
        else {
          let n0_idx = working_needles[b0].indexOf(n0);
          if (n0_idx !== -1) working_needles[b0].splice(n0_idx, 1);
        }
      }

      //TODO: if n === row endN, we assume it was the user's intention to have the carrier miss out of the way, so we can add a miss if no longer ends with the end needle
      let b = bn.match(/[a-zA-Z]+/)[0];
      let n = Number(bn.match(/\d+/)[0]);

      if (d) k_args.d = d; //new
      // k_args.bn = [b, n]; //new

      if (cs.length) { //TODO: have option for shaping without cs.length when increasing or decreasing by xfer //?
        k_args.cs = cs; //new //ToDO: determine if should be after parseInt

        // if (!input_carriers.includes(cs[c])) { // this carrier is being used for the first time (op should be in or inhook, really)
        //   input_carriers.push(cs[c]);
        // }

        // update min and max needles of the piece if its the caston:
        if (row_idx === -1 && op !== 'miss') {
          if (n < MIN) MIN = n;
          if (n > MAX) MAX = n;
        } else if (op === 'miss') { //we assume that we should miss past the end needle, since that's what is in the original code 
          if (n === MIN && d === '-' && k_args.bn[1] !== leftN) {
            // iter_output.push(`miss - f${leftN} ${cs.join(' ')}`); //new //*
            miss_op = new KnitoutOp('miss');
            miss_op.addArgs({'d': '-', 'bn': ['f', leftN], 'cs': cs}); //TODO: add cs later
            // output.push(`miss - f${leftN} ${cs.join(' ')}`);
          
          } else if (n === MAX && d === '+' && k_args.bn[1] !== rightN) {
            // iter_output.push(`miss + f${rightN} ${cs.join(' ')}`); //new //*
            miss_op = new KnitoutOp('miss');
            miss_op.addArgs({'d': '+', 'bn': ['f', rightN], 'cs': cs}); //TODO: add cs later
            // output.push(`miss + f${rightN} ${cs.join(' ')}`); // TODO: figure out how to order this with everything else
          }
        }

        if (skip_args) { //TODO: adjust this :/
          // output = output.concat(iter_output);
          if (k_args.d !== skip_args.d || k_args.cs !== skip_args.cs) skip_args = undefined;
          else skip = true; //continue row_loop;
        }

        /*
        for (let c=0; c<cs.length; ++c) {
          // cs[c] = parseInt(cs[c]);
          if (sect_idx == 0) {
            if (!sect_track[sect_idx].carriers.includes(cs[c])) {
              leftover_carriers.splice(leftover_carriers.indexOf(cs[c]), 1); //*
              sect_track[sect_idx].carriers.push(cs[c]);
            }
          } else {
            let carrier;
            let c_idx = sect_track[0].carriers.indexOf(cs[c]);
            if (c_idx > sect_track[sect_idx].carriers.length-1) { // not included in the carriers yet
              carrier = leftover_carriers.shift(); //*
              sect_track[sect_idx].carriers.push(carrier);
            } else carrier = sect_track[sect_idx].carriers[c_idx];
            cs[c] = carrier; //new //*
          }
          carrier_track[cs[c]] = d; //new //*
        }
        */

        if (!skip && shaping_needles.length) {
          let shapeNs = [];
          
          if (d === '+') shapeNs = shaping_needles.filter(el => el < n);
          else shapeNs = shaping_needles.filter(el => el > n); //TODO: determine if need to reverse this

          // if (prevNs.length) {
          //   for (let prevN of prevNs) {
          //     let shaping = row_shaping[prevN];
          //     if (shaping.direction === d) insertShaping(shaping, shaping_needles, cs[0], output);
          //   }
          // }

          if (shaping_needles.includes(n)) shapeNs.push(n); //shaping = row_shaping[n];

          if (shapeNs.length) {
            for (let shapeN of shapeNs) {
              let shaping = row_shaping[shapeN];

              if (!shaping.direction || shaping.direction === d) {
                if (shaping.type === 'decrease' && shaping.count > MAX_XFER_CT) {
                  if (shaping.side === 'left' && d === '-') { // for multi decrease on left side: if d === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.
                    for (let n=shaping.newN; n>=shaping.prevN; --n) {
                      iter_output.push(`knit - b${n} ${cs.join(' ')}`);
                    }
                  } else if (shaping.side === 'right' && d === '+') { // for multi decrease on right side: if d === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.
                    for (let n=shaping.newN; n<=shaping.prevN; ++n) {
                      iter_output.push(`knit + b${n} ${cs.join(' ')}`); 
                    }
                  }
                }

                // twisted_stitches = twisted_stitches.concat(insertShaping(shaping, cs.join(' '), output, row_idx)); //beep
                insertShaping(shaping, cs.join(' '), iter_output, row_idx);

                if (shaping.type === 'increase' && shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) skip_args = {...k_args}; //((shaping.side === 'left' && shaping.direction === '-') || (shaping.side === 'right' && shaping.direction === '+'))) // we want to skip all other needles
              }

              /*
              if (shaping.direction !== d && shaping.type === 'decrease' && Math.abs(shaping.count) > MAX_XFER_CT) {
                let condition = d === '+' ? ((n_) => {n_ <= shaping.prevN}) : ((n_) => {n_ >= shaping.prevN});
                // if (d === '+') condition = (n_) => {n_ <= shaping.prevN};
                // else condition = (n_) => {n_ >= shaping.prevN};
                shape_row_loop: for (r; r<row.length; ++r) {
                  let ln_ = row[r];

                  let [op_, d_, bn0_, bn_, cs_] = knitoutInfo(ln_);
                  if (!bn_) output.push(ln_);
                  else {
                    let b_ = bn_.match(/[a-zA-Z]+/)[0];
                    let n_ = Number(bn_.match(/\d+/)[0]);
                    if (condition(n_)) {
                      if (bn0) {
                        let b0 = bn0.match(/[a-zA-Z]+/)[0];
                        let n0 = Number(bn.match(/\d+/)[0]);
                
                        if (!eligible_needles.includes(n0)) continue shape_row_loop;
                        else {
                          let n0_idx = working_needles[b0].indexOf(n0);
                          if (n0_idx !== -1) working_needles[b0].splice(n0_idx, 1);
                        }
                      }

                      if (!working_needles[b_].includes(n_)) working_needles[b_].push(n_);
                      output.push(ln_);
                    } else break shape_row_loop;
                  }
                }

                insertShaping(shaping, cs[0], output, row_idx);
                if (shaping.type === 'increase' && shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) skip_args = {...k_args}; //((shaping.side === 'left' && shaping.direction === '-') || (shaping.side === 'right' && shaping.direction === '+'))) // we want to skip all other needles
                continue;
              } else if (shaping.direction === d) {
                insertShaping(shaping, cs[0], output, row_idx);
                if (shaping.type === 'increase' && shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) skip_args = {...k_args}; //((shaping.side === 'left' && shaping.direction === '-') || (shaping.side === 'right' && shaping.direction === '+'))) // we want to skip all other needles
              }
              */
            }
          }
        }
      }

      if (!skip && n >= leftN && n <= rightN) {
        // if (in_op) {
        //   if (in_op.cs === OG_cs) {
        //     in_op.cs = cs;
        //     in_op.generateCode(output);
        //   }
        //   // output.splice(in_op[2], 0, `${in_op[0]} ${in_op[1]}`); //  index, 0, item

        //   in_op = undefined;
        // }
        k_args.bn = [b, n]; //new

        if (!working_needles[b].includes(n)) working_needles[b].push(n);
        if (op === 'knit' && twisted_stitches.includes(bn)) {
          if (d === '+') {
            iter_output.push(';twisted stitch', `miss + ${bn} ${cs.join(' ')}`, `knit - ${bn} ${cs.join(' ')}`, `miss + ${bn} ${cs.join(' ')}`);
          } else {
            iter_output.push(';twisted stitch', `miss - ${bn} ${cs.join(' ')}`, `knit + ${bn} ${cs.join(' ')}`, `miss - ${bn} ${cs.join(' ')}`);
          }
          twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
        } else iter_output.push(ln);
      }

      if (miss_op) miss_op.generateCode(iter_output); //new //*

      if (cs.length && iter_output.length) { // replace the carriers
        //beep:
        let cs_str = ' ' + cs.join(' '); //new //TODO
        let replace_cs = []; //new //*

        for (let c=0; c<cs.length; ++c) {
          let carrier; // = cs[c]; //new //*
          if (!input_carriers.includes(cs[c])) { // this carrier is being used for the first time (op should be in or inhook, really)
            carrier = cs[c];
            input_carriers.push(carrier);
            sect_track[sect_idx].carriers.push(carrier); //TODO: check
          } else {
            if (sect_track[sect_idx].carriers.includes(cs[c])) {
              carrier = cs[c];
            } else {
              let c_idx = input_carriers.indexOf(cs[c]);

              carrier = sect_track[sect_idx].carriers[c_idx];

              if (!carrier) { // not included in the carriers yet
                for (let i=sect_track[sect_idx].length; i<c_idx; ++i) { // good new is if the carrier was already undefined in this way and it was just added, this loop won't run since start idx > end idx
                  sect_track[sect_idx].carriers.push(undefined); // placeholder for any carriers that just aren't included in there
                }

                if (sect_track[sect_idx].parents.length) { // we could get some carriers from here to reuses
                  find_replacement: for (let parent of sect_track[sect_idx].parents) {
                    let replaceC = parent.carriers[c_idx];
                    if (replaceC) {
                      carrier = replaceC; //TODO: place this carrier in the correct position, if necessary (NOTE: can do this by tracking when it was last parked)
                      parent.carriers[c_idx] = undefined;
                      break find_replacement;
                    }
                  }
                }

                if (!carrier) { // if still no good match, find closest one
                  let dists = leftover_carriers.map(car => Math.abs(carrier_park[car] - n));
                  c_idx = dists.indexOf(Math.min(...dists));
                  carrier = leftover_carriers.splice(c_idx, 1); //[dists.indexOf(Math.min(...dists))];
                }
                // if (!carrier) carrier = leftover_carriers.pop(); // if still no carrier
              }
            }
          }

          replace_cs.push(carrier); //new //*
          if (d) carrier_track[carrier] = d; //new //*

          carrier_park[carrier] = n; //new //*
        }
  
        // ln = ln.replace(cs_str, ' ' + cs.join(' ')); // replace with new carriers //beep

        //beep
        
        if (in_op) {
          if (in_op.cs === cs) {
            in_op.cs = replace_cs;
            in_op.generateCode(output);
          }
          // output.splice(in_op[2], 0, `${in_op[0]} ${in_op[1]}`); //  index, 0, item

          in_op = undefined;
        }

        iter_output = iter_output.map(el => el.replace(cs_str, ' ' + replace_cs.join(' ')))
      }

      output = output.concat(iter_output);
      
      // {
      //   let bn = info[2];
      //   b = bn.match(/[a-zA-Z]+/)[0];
      //   n = Number(bn.match(/\d+/)[0]);
      // }

    }
  }

  return output; //new //*
}

function generateKnitout(file_content, shape_code, inc_method) {
  specs['inc_method'] = inc_method; //set global
  let [header_section, caston_section, rows, bindoff_section] = rowsPassesArray(file_content);

  let carriers_header = header_section.find(el => el.includes(';;Carriers:'));
  let machine_header = header_section.find(el => el.includes(';;Machine:'));

  specs['carriers'] = carriers_header.split(':')[1].trim().split(' ');
  leftover_carriers = [...specs.carriers]; //new //*
  specs['machine'] = machine_header ? machine_header.split(':')[1].trim().toLowerCase() : (specs.carriers.length === 6 ? 'kniterate' : 'swgn2');

  let out_park = specs.machine === 'kniterate' ? -Infinity : Infinity; // this means they all start off the needle bed (parity determined by where carriers are parked when they're out)
  for (let c of specs.carriers) {
    carrier_park[c] = out_park;
  }

  let output = header_section;

  let [rows_edgeNs, rows_sect_idxs, sect_track, shaping] = determineShaping(shape_code); //NOTE: shape_code should be `shape_code_reverse`

  // let [init_leftN, init_rightN] = rows_edgeNs[0];
  
  for (let r=0; r<rows.length; ++r) {
    output.push(`;row: ${r+1}`);

    shaping_needles = Object.keys(shaping[r]).map(Number);
    let eligible_needles = [];
    for (let edgeNs of rows_edgeNs[r]) {
      for (let n=edgeNs[0]; n<=edgeNs[1]; ++n) {
        eligible_needles.push(n);
      }
    }

    for (let b of Object.keys(working_needles)) {
      working_needles[b] = working_needles[b].filter(n => eligible_needles.includes(n)); //n >= leftN && n <= rightN);
    }

    let sect_ct = rows_edgeNs[r].length;

    // if (prev_sect_ct && prev_sect_ct !== sect_ct) { // change in number of sections // sections are ordered from left to right

    // }

    let sect_idxs = rows_sect_idxs[r];

    for (let i=0; i<sect_idxs.length; ++i) {
      if (sect_ct > 1) output.push(`;section: ${i+1}/${sect_ct}`);

      let sect = sect_track[sect_idxs[i]];
      // if (!sect.carriers.length) console.log("TODO: plan for which carriers should go to this section."); //remove //debug

      if (r === 0) output = output.concat(cookieCutter(caston_section, rows_edgeNs[r][i], shaping[r], -1, sect_idxs[i])); // caston (row_idx === -1 indicates that this is the caston)
      output = output.concat(cookieCutter(rows[r], rows_edgeNs[r][i], shaping[r], r, sect_idxs[i])); //TODO: if r === 0 and i === 0, 

      // if (r === 0) cookieCutter(caston_section, rows_edgeNs[r][i], shaping[r], output, -1, sect_idxs[i]); // caston (row_idx === -1 indicates that this is the caston)
      // cookieCutter(rows[r], rows_edgeNs[r][i], shaping[r], output, r, sect_idxs[i]); //TODO: if r === 0 and i === 0, 
    }

    /* //TODO: //remove this
    for (let i=0; i<sect_ct; ++i) { 
      if (sect_ct > 1) output.push(`;section: ${i+1}/${sect_ct}`);
      if (r === 0) cookieCutter(caston_section, rows_edgeNs[r][i], shaping[r], output, -1, i); // caston (row_idx === -1 indicates that this is the caston)
      cookieCutter(rows[r], rows_edgeNs[r][i], shaping[r], output, r, i);
    }
    */
  }

  let bindoff_ln = bindoff_section.find(ln => ln.includes('knit '));

  if (bindoff_ln) {
    output.push(';bindoff section');
    
    let [op, d, bn0, bn, cs] = knitoutInfo(bindoff_ln);
    let bindoff_carrier = cs[0]; //.join(' ');

    let bindoff_edgeNs = rows_edgeNs[rows.length-1][0]; //TODO: do this for each section, if applicable
    let bindoff_count = bindoff_edgeNs[1]- bindoff_edgeNs[0]+1;
    let bindoff_side, bindoffN;

    if (carrier_track[bindoff_carrier] === '-') {
      bindoff_side = 'left';
      bindoffN = bindoff_edgeNs[0];
    } else {
      bindoff_side = 'right';
      bindoffN = bindoff_edgeNs[1];
    }

    helpers.bindoff(specs, bindoff_side, bindoff_count, bindoffN, bindoff_carrier, output, false, []);
  } else {
    output.push(';drop finish');
    working_needles['f'].sort();
    working_needles['b'].sort();

    for (let n of working_needles['f']) {
      output.push(`drop f${n}`);
    }

    for (let n of working_needles['b']) {
      output.push(`drop b${n}`);
    }
  }

  // for (let c of Object.keys(carrier_track)) { // take out any carriers that weren't taken out yet
  for (let c of specs.carriers) {
    if (!leftover_carriers.includes(c)) { // take out any working carriers that weren't taken out yet
      if (specs.machine === 'swgn2') output.push(`outhook ${c}`);
      else output.push(`out ${c}`);
    }
  }
  
  //TODO: add bindoff section

  // shaped_rows = shaped_rows.flat();
	let final_file = JSON.stringify(output).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
	final_file = final_file.join('\n');
  return final_file;
}


module.exports = { generateKnitout };



/*
let output = [];
let input = [';comment', 'inhook 4', 'knit + f10 4', 'knit + f11 4', 'inhook 5', ';comment', 'inhook 6', 'knit + f14 6'];

let in_op;
for (let r=0; r<input.length; ++r) {
  let info = input[r].split(' ');
  let op = info[0];
  let cs;
  if (info.length > 1) cs = info[info.length-1];
  if (op === 'in' || op === 'inhook') in_op = [op, cs, output.length-1];
  else {
    if (cs) {
      if (in_op) {
        if (cs === in_op[1]) {
          output.splice(in_op[2], 0, `${in_op[0]} ${in_op[1]}`); //  index, 0, item
        }
        in_op = undefined;
      }
    }

    output.push(input[r]);
  }
}
*/

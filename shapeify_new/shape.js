/*
TODO:
----
- [x] fix miss past increase (aka don't miss past next use if will be increasing there)
- [x] also, don't miss past endN if multi increase
- [x] fix increase doing too much (starting on wrong needle (left: one too little) and ending on extra needle)
- [ ] fix issue with test1: decrease in between
*/

const MAX_XFER_CT = 2; //TODO: adjust according to code
const MIN_FLOAT_DIST = 5;

const { KnitoutOp, tuckPattern, inc1DoubleBed, inc2DoubleBed, incMultDoubleBed, decDoubleBedTempFix, bindoff } = require('./helpers.js');


function arraysEqual(a, b, order_matters) {
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
    if (order_matters) return a.every((val, idx) => val === b[idx]);
    else return a.every(val => b.includes(val));
  } else return false;
}


// global variables:
let header_section = [], waste_section = [], caston_section = [], bindoff_section = [];
let rows = [];
let rows_edgeNs = [];
let rows_sect_keys = [];
// left and right needles of original piece:
let MIN = Infinity, MAX = -Infinity;
let in_carriers = [];
let input_carriers = [];

let specs = {};
let leftover_carriers = [];

let sect_track = {};

let carrier_track = {};
let carrier_ops = {};
let carrier_ops_keys = {};
let last_carrier_ops = {};

let working_needles = {
  'f': [],
  'b': [],
  'fs': [],
  'bs': []
}

let shaping_needles = [];

let twisted_stitches = [];

class Carrier {
  constructor({row, n, d}) {
    this.row = row;
    this.n = n;
    this.d = d;
  }
}


class Section {
  constructor(idx) {
    this.idx = idx;
    this.edgeNs = {};
    this.parents = [];
    this.children = {};
    this.carriers = [];
  }
}


class Shaping {
  constructor(type, side, count, prevN, newN, d) {
    this.type = type;
    this.side = side;
    this.count = count;
    this.prevN = prevN;
    this.newN = newN;
    this.d = d;
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
        dict[newN] = new Shaping(type, side, count, prevN, newN, '+'); // miss + {bed}{prevN+1} before inc // *knit - up to new needle after inc (with twisted stitch, if relevant)* 
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
    count = Math.abs(count);
    if (side === 'left') {
      if (count > MAX_XFER_CT) { //NOTE: multi decrease on left side *should always be knitted in the + direction, and should not knit through newN during dec*
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // TODO: if d === '+', insert before and then just resume. if d === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // hmmm... direction doesn't matter.... // if d === '-', miss + {bed}{newN+1} before dec
      }
    } else {  // right side
      if (count > MAX_XFER_CT) { //NOTE: multi decrease on right side *should always be knitted in the - direction, and should not knit through newN during dec*
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // TODO: if direction === '-', insert before and then just resume. if d === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.
      } else {
        dict[newN] = new Shaping(type, side, count, prevN, newN, undefined); // hmmm... direction doesn't matter.... // if d === '+', miss - {bed}{newN-1} before dec
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
function rowsArray(file_content) {
  let file_start = /^(?!;).+/gm.exec(file_content).index;
  let rows_start = /;row:/.exec(file_content).index;
  let bindoff_start = /;bindoff/.exec(file_content).index; //TODO: adjust for when do drop bindoff
  // get all row matches with: file_content2.match(/;row/gm)
  let header_arr = file_content.slice(0, file_start).split(/\r?\n/);
  let waste_arr = [];
  let caston_arr = file_content.slice(file_start, rows_start).split(/\r?\n/);
  let main_section = file_content.slice(rows_start, bindoff_start);
  let bindoff_arr = file_content.slice(bindoff_start, -1).split(/\r?\n/);

  // let carrier_ln = ln.match(/^(knit) ([+|-])( ?([[f|b]\d+)? ([[f|b]\d+))([ \d+]+)/);

  let caston_ln = [...caston_arr].reverse().find(ln => ln.includes('knit '));

  if (caston_ln) {
    let info = knitoutInfo(caston_ln);
    let caston_cs = info.cs;

    let waste_idx = -1;
    for (let i=caston_arr.length-1; i >= 0; --i) {
      let carrier_ln = caston_arr[i].match(/^(knit|miss|tuck|split) ([+|-])( ?([[f|b]\d+)? ([[f|b]\d+))([ \d+]+)/);
      if (carrier_ln) {
        let cs = carrier_ln[6].trim().split(' ');
        if (!arraysEqual(cs, caston_cs)) {
          waste_idx = i;
          break;
        }
        // if (cs[0])
      }
    }

    if (waste_idx !== -1) {
      waste_arr = caston_arr.splice(0, waste_idx+1);
    }
  }

  let rows_arr = main_section.split(/;row:.+\r?\n/).slice(1); //since first will be blank

  if (!rows_arr.length) throw new Error('Input file does not contain the format needed to work with this program.  Please reproduce the file with the "knitify" program.')

  for (let r=0; r<rows_arr.length; ++r) {
    rows_arr[r] = rows_arr[r].split(/\r?\n/);
  }
  return [header_arr, waste_arr, caston_arr, rows_arr, bindoff_arr];
}


function determineShaping(shape_code) {
  let sect_idx = 0;

  let shaping = [];

  let prev_edgeNs = {};

  for (let r=0; r<shape_code.length; ++r) {
    let row_code = shape_code[r];

    let row_shaping = {};
    let row_sect_track = {};
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

        if (r === 0) { // first row
          sect_track[sect_idx] = new Section(sect_idx);

          sect_track[sect_idx].edgeNs[r] = sect_edgeNs;

          row_sect_track[sect_idx] = sect_edgeNs; // keep track on sections in this row
          sect_idx += 1;
        }

        sect_edgeNs = [];

        sect_ct += 1;
      }
    }

    if (Object.keys(prev_edgeNs).length) {
      let leftover_prev_edgeNs = {...prev_edgeNs}; // we will find out of there are any prev sections that need to be bound off

      for (let i=0; i<sect_ct; ++i) {
        let sect_shaping = {};

        let sect_key;
        let leftN = row_edgeNs[i][0];
        let rightN = row_edgeNs[i][1];
        
        let sect_matches = Object.fromEntries(Object.entries(prev_edgeNs).filter(([k,v]) => v[0] <= rightN && v[1] >= leftN));

        let match_keys = Object.keys(sect_matches);
        if (match_keys.length) { // could be multiple prev sections merging, or just one (if length === 1)
          leftover_prev_edgeNs = Object.fromEntries(Object.entries(leftover_prev_edgeNs).filter(([k,v]) => !Object.keys(sect_matches).includes(k)));

          for (let s=0; s<match_keys.length; ++s) {
            let prevNs = sect_matches[match_keys[s]];
            let prev_leftN = prevNs[0];
            let prev_rightN = prevNs[1];

            let next_sect_leftN = row_code.indexOf(1, rightN); // search for next indication of a section in the current row

            let last_overlap = (next_sect_leftN === -1 || next_sect_leftN+1 > prev_rightN);
            if (s === 0) { // no overlapping match before this
              let match_children = sect_track[match_keys[s]].children;
              let children_keys = Object.keys(match_children);

              if (!children_keys.length) { // no section before this
                if (match_keys.length === 1 && last_overlap) sect_key = match_keys[s]; // if no more upcoming sections or next section doesn't overlap with this match, just consider this current section to be a continuation of the match
                trackShaping('left', prev_leftN, leftN, sect_shaping);
              } else { // section before this, track as shaping between that section's right needle+1 (as left needle) and this section's left needle (as right needle)
                let prev_sect_rightN = match_children[children_keys[children_keys.length-1]][1];
                trackShaping('left', prev_sect_rightN, leftN, sect_shaping); //row_shaping);
              }

              if (sect_key === undefined) { // consider it to be a new section, with "parent" sections
                sect_key = sect_idx;
                sect_track[sect_key] = new Section(sect_idx);
                sect_track[sect_key].parents.push(match_keys[s]); // save this overlapping section as a "parent"
                sect_track[match_keys[s]].children[sect_key] = [leftN, rightN]; // .push(sect_key);
                sect_idx += 1;
              }

              row_sect_track[sect_key] = [leftN, rightN];
              sect_track[sect_key].edgeNs[r] = [leftN, rightN];
            } else { // let's see if there is an increase (merging of two sections)
              sect_track[sect_key].parents.push(match_keys[s]); // save this overlapping section as a "parent"
              sect_track[match_keys[s]].children[sect_key] = [leftN, rightN];

              let leftN_ = [match_keys[s-1]][1]+1;
              trackShaping('left', prev_leftN, leftN_, sect_shaping); //row_shaping);
            }

            if (s === match_keys.length-1) { // no overlapping match after this
              if (last_overlap) trackShaping('right', prev_rightN, rightN, sect_shaping);
            }
          }
        } else { // new section, store it and count its initiation as an increase (really, a caston)
          sect_key = sect_idx;

          sect_track[sect_key] = new Section(sect_key);
          sect_track[sect_key].edgeNs[r] = [leftN, rightN];
          row_sect_track[sect_key] = [leftN, rightN];
          sect_idx += 1;

          let count = rightN-leftN+1; //TODO: make sure everything is ok with +1 for others
          sect_shaping[leftN] = new Shaping('increase', 'left', count, rightN, leftN, '+'); //TODO: make this 'caston' instead of 'increase' //?
          sect_shaping[rightN] = new Shaping('increase', 'right', count, leftN, rightN, '+');
        }

        row_shaping[sect_key] = sect_shaping;
      }

      if (Object.keys(leftover_prev_edgeNs).length) { // we need to bind these off (do it in previous row)
        for (let [sect_key, edgeNs] of Object.entries(leftover_prev_edgeNs)) {
          let prev_leftN = edgeNs[0];
          let prev_rightN = edgeNs[1];

          let count = prev_rightN-prev_leftN+1; //TODO: make sure everything is ok with +1 for others

          row_shaping[sect_key] = {};
          row_shaping[sect_key][prev_leftN] = new Shaping('bindoff', 'left', count, prev_leftN, prev_rightN, '-'),
          row_shaping[sect_key][prev_rightN] = new Shaping('bindoff', 'right', count, prev_rightN, prev_leftN, '+')
          // shaping[shaping.length-1][sect_key][prev_leftN-1] = new Shaping('bindoff', 'left', count, prev_leftN-1, prev_rightN+1, '-');
          // shaping[shaping.length-1][sect_key][prev_rightN+1] = new Shaping('bindoff', 'right', count, prev_rightN+1, prev_leftN-1, '+');
        }
      }
    } else {
      for (let sect_key of Object.keys(row_sect_track)) {
        row_shaping[sect_key] = {};
      }
    }

    shaping.push(row_shaping);
    prev_edgeNs = row_sect_track;
    rows_sect_keys.push(Object.keys(row_sect_track));
    rows_edgeNs.push(row_edgeNs);
  }

  return shaping;
}


function insertShaping(shaping, cs, output) {
  output.push(new KnitoutOp({comment: `${shaping.type} ${Math.abs(shaping.count)} on ${shaping.side} (${shaping.prevN} => ${shaping.newN})`}));

  if (shaping.type === 'increase') {
    if (shaping.count > MAX_XFER_CT) incMultDoubleBed(shaping.side, shaping.count, shaping.prevN, cs, output);
    else {
      if (twisted_stitches.length) {
        let requiredNs = [`f${shaping.prevN}`, `b${shaping.prevN}`]; //['f', shaping.prevN], ['b', shaping.prevN]];

        if (shaping.side === 'left') {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN+1}`, `b${shaping.prevN+1}`);

          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(
                new KnitoutOp({comment: 'twisted stitch !'}), //TODO: //remove '!'
                new KnitoutOp({op: 'miss', d: '-', bn: bn, cs: cs}),
                new KnitoutOp({op: 'knit', d: '+', bn: bn, cs: cs}),
                new KnitoutOp({op: 'miss', d: '-', bn: bn, cs: cs})
              );
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        } else {
          if (shaping.count === 2) requiredNs.unshift(`f${shaping.prevN-1}`, `b${shaping.prevN-1}`);
          for (let bn of requiredNs) {
            if (twisted_stitches.includes(bn)) {
              output.push(
                new KnitoutOp({comment: 'twisted stitch !'}), //TODO: //remove '!'
                new KnitoutOp({op: 'miss', d: '+', bn: bn, cs: cs}),
                new KnitoutOp({op: 'knit', d: '-', bn: bn, cs: cs}),
                new KnitoutOp({op: 'miss', d: '+', bn: bn, cs: cs})
              );
              twisted_stitches.splice(twisted_stitches.indexOf(bn), 1);
            }
          }
        }
      }

      if (shaping.count === 1) twisted_stitches = twisted_stitches.concat(inc1DoubleBed(specs, shaping.side, shaping.prevN, cs, output));
      else if (shaping.count === 2) twisted_stitches = twisted_stitches.concat(inc2DoubleBed(specs, shaping.side, shaping.prevN, cs, output));
    }
  } else if (shaping.type === 'decrease') { //TODO: deal temp fix for kniterate
    if (shaping.count > MAX_XFER_CT) bindoff(specs, shaping.side, shaping.count, shaping.prevN, cs, output, true, []);
    else decDoubleBedTempFix(specs, shaping.side, shaping.count, shaping.prevN, output);
  } else if (shaping.type === 'bindoff') {
    let off_limits = shaping.side === 'left' ? [shaping.prevN-1] : [shaping.prevN+1];
    bindoff(specs, shaping.side, shaping.count, shaping.prevN, cs, output, false, off_limits);
  }

  let newN_idx = shaping_needles.indexOf(shaping.newN);
  let prevN_idx = shaping_needles.indexOf(shaping.prevN);

  if (newN_idx !== -1) delete shaping_needles[newN_idx];
  if (prevN_idx !== -1) delete shaping_needles[prevN_idx];
}


let yarn_ops = ['in', 'out', 'inhook', 'releasehook', 'outhook'];

function knitoutInfo(ln) {
  ln = ln.trim();

  let info = [];
  let op, d, bn0=[], bn=[], cs=[], param, comment;
  if (ln.includes(';;')) {
    info = ln.split(':');
    op = info[0] + ':';
  } else if (ln.includes(';')) {
    let comment_idx = ln.indexOf(';');
    comment = ln.slice(comment_idx);

    info = ln.slice(0, comment_idx).trim().split(' ');
  } else {
    info = ln.trim().split(' ');
  }

  if (info[0].trim().length) {
    op = info[0];
    if (op === 'rack' || (op.length > 1 && (op.slice(0, 2) === 'x-' || op.slice(0, 2) === ';;'))) {
      param = info[1].trim();
    } else {
      if (yarn_ops.includes(op)) cs = info.slice(1);
      else if (op === 'knit' || op === 'tuck' || op === 'miss' || op === 'split') {
        d = info[1];
        if (op === 'split') {
          bn0 = [info[2].match(/[a-zA-Z]+/)[0], Number(info[2].match(/\d+/)[0])];
          bn = [info[3].match(/[a-zA-Z]+/)[0], Number(info[3].match(/\d+/)[0])];
          cs = info.slice(4);
        } else {
          bn = [info[2].match(/[a-zA-Z]+/)[0], Number(info[2].match(/\d+/)[0])];
          cs = info.slice(3);
        }
      } else if (op === 'xfer') {
        bn0 = [info[1].match(/[a-zA-Z]+/)[0], Number(info[1].match(/\d+/)[0])];
        bn = [info[2].match(/[a-zA-Z]+/)[0], Number(info[2].match(/\d+/)[0])];
      } else if (op === 'drop')  bn = [info[1].match(/[a-zA-Z]+/)[0], Number(info[1].match(/\d+/)[0])]; //info[1];
      else throw new Error(`Unrecognized operation: ${op}.`)
    }
  }

  return new KnitoutOp({op: op, d: d, bn0: bn0, bn: bn, cs: cs, param: param, comment: comment});
}


// check whether a carrier appears in the input piece ever again:
function carrierDone(carrier, row_key, ln_idx) {
  let last_op = last_carrier_ops[carrier];
  let carrier_done = last_op.row == row_key ? (last_op.idx > ln_idx) : (last_op.row < row_key); //TODO: decide btw > and >=

  /*
  let arr = row_idx === -1 ? caston_section : rows[row_idx];

  if (ln_idx < arr.length-1) {
    for (let i=ln_idx+1; i<arr.length; ++i) {
      let ln = arr[i];
      let next_op = knitoutInfo(ln);
      if (next_op.cs.includes(carrier)) return false;
    }
  }

  find_next_op: for (let r=row_idx+1; r<rows.length; ++r) {
    for (let ln of rows[r]) {
      let next_op = knitoutInfo(ln);
      if (next_op.cs.includes(carrier)) return false;
    }
  }

  return true; // if nothing found, carrier is done
  */
//  if (return_row) return [carrier_done, last_op.row];
 return carrier_done;
}


function placeCarrier(d, n, carrier, edgeNs, row_idx, ln_start, sect_key, row_key) {
  let [minN, maxN] = edgeNs;

  let ln_i = ln_start; //+1; // first check if there is any use in the current row
  // let keys = Object.keys(carrier_ops).sort((a, b) => a-b);
  // let key_i = keys.indexOf(row_key.toString());
  let r = row_idx;
  find_next_op: for (let key of carrier_ops_keys) {
    if (Number(key) < row_key) continue;

    let i = rows_sect_keys[r].indexOf(sect_key);
    if (i === -1) {
      // if (!Object.keys(sect_track[sect_key].children).some(key => rows_sect_keys[r].includes(key))) carrier_done = true;
      break find_next_op;
    }

    let [leftN, rightN] = rows_edgeNs[r][i];
    if (leftN < minN) minN = leftN;
    if (rightN > maxN) maxN = rightN;

    let carrier_op = carrier_ops[key].find(op => op.cs.includes(carrier) && op.bn[1] >= leftN && op.bn[1] <= rightN && op.idx >= ln_i);
    if (carrier_op) {
      if (r === row_idx+1) {
        let first_cs = carrier_ops[key].find(op => op.bn[1] >= leftN && op.bn[1] <= rightN && op.idx >= ln_i).cs;

        if (first_cs.includes(carrier)) {
          if (d === '-' && (edgeNs[0]-leftN > MAX_XFER_CT)) {
            if (edgeNs[0] < n) return edgeNs[0];
            else return null;
          } else if (d === '+' && (rightN-edgeNs[1] > MAX_XFER_CT)) {
            if (edgeNs[1] > n) return edgeNs[1];
            else return null;
          }
        }
      }

      break find_next_op;
    }

    ln_i = 0;
    if (Number(key) > -1) r += 1;
  }

  if (d === '-' && minN < n) return minN;
  else if (d === '+' && maxN > n) return maxN;
  else return null;
}


function cookieCutter(row, edgeNs, row_shaping, row_idx, sect_key, row_key) {
  let output = [];

  let skip_args = undefined;
  let [leftN, rightN] = edgeNs;

  let k_args = {
    'd': undefined,
    'bn': [],
    'cs': [],
  };

  row_loop: for (let r=0; r<row.length; ++r) { //TODO: filter out any extensions/racks that don't work here
    let ln_inserted = false;

    let to_drop = [];
    let doneCs = [];
    let op_n;
    let miss_op;
    let skip = false;
    let iter_output = [];
    let replace_cs = [];

    let ln = row[r];
    let info = knitoutInfo(ln);

    if (k_args.cs.length && row_idx < rows.length-1 && ((info.cs.length && !arraysEqual(k_args.cs, info.cs)) || r === row.length-1)) { // might no longer be using the previous carrier, or might need to miss it out of the way
      for (let c of k_args.cs) {
        let sectC = sect_track[sect_key].carriers[input_carriers.indexOf(c)];

        let carrier_done = carrierDone(c, row_key, r);

        // if (!carrier_done && k_args.d === '-' && shaping)
        // missN: if (!carrier_done && k_args.d === '-' && )
        let missN = r === row.length-1 ? placeCarrier(k_args.d, k_args.bn[1], c, edgeNs, row_idx+1, 0, sect_key, row_key) : placeCarrier(k_args.d, k_args.bn[1], c, edgeNs, row_idx, r, sect_key, row_key);

        
        // let [missN, carrier_done] = placeCarrier(k_args.d, k_args.bn[1], c, edgeNs, row_idx, r, sect_key);

        if (missN !== null) {
          miss_op = new KnitoutOp({op: 'miss', d: k_args.d, bn: ['f', missN], cs: [sectC]});
          carrier_track[sectC].n = missN;
        }

        if (carrier_done) {
          doneCs.push(sectC);
          carrier_track[sectC].n = k_args.bn[1];
        }
      }
    }

    if (!info.bn.length) {
      if (!yarn_ops.includes(info.op)) output.push(ln);
    } else {
      if (info.bn0.length) {
        let b0 = info.bn0[0];
        let n0 = info.bn0[1];

        if (n0 < leftN || n0 > rightN) continue;
        else {
          let n0_idx = working_needles[b0].indexOf(n0);
          if (n0_idx !== -1) working_needles[b0].splice(n0_idx, 1);
        }
      }

      let b = info.bn[0];
      let n = info.bn[1];

      if (info.cs.length) { //TODO: have option for shaping without cs.length when increasing or decreasing by xfer //?
        if (info.d) k_args.d = info.d;
        k_args.cs = info.cs;

        if (skip_args) { //TODO: adjust this //?
          if (k_args.d !== skip_args.d || !arraysEqual(k_args.cs, skip_args.cs)) skip_args = undefined;
          else skip = true;
        }

        if (row_key > -1 && !skip && shaping_needles.length) {
          let shapeNs = [];
          
          if (info.d === '+') shapeNs = shaping_needles.filter(el => el < n);
          else shapeNs = shaping_needles.filter(el => el > n); //TODO: determine if need to reverse this

          if (shaping_needles.includes(n)) shapeNs.push(n);

          if (shapeNs.length) {
            for (let shapeN of shapeNs) {
              let shaping = row_shaping[shapeN];

              if (!shaping.d || shaping.d === info.d) {
                if (shaping.type === 'decrease') {
                  if (shaping.side === 'left' && info.d === '-') {
                    if (!ln_inserted) { //TODO: check that this is working
                      iter_output.push(Object.assign(Object.create(KnitoutOp.prototype), info)); // insert ln before decrease on right for pass in + direction
                      ln_inserted = true;
                    }
                    if (shaping.count > MAX_XFER_CT) { // for multi decrease on left side: if d === '-', add - pass that goes from newN to prevN, does decrease, and then resumes.
                      for (let n=shaping.newN; n>=shaping.prevN; --n) {
                        iter_output.push(new KnitoutOp({op: 'knit', d: '-', bn: ['b', n], cs: info.cs}));
                      }
                    } else {
                      if (miss_op && miss_op.bn[1] < shaping.prevN) iter_output.push(miss_op);
                      else iter_output.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', shaping.prevN], cs: info.cs})); //TODO: maybe check to ensure that info.bn[1] < saping.prevN //?
                      miss_op = undefined;
                    }
                  } else if (shaping.side === 'right' && info.d === '+') {
                    if (!ln_inserted) {
                      iter_output.push(Object.assign(Object.create(KnitoutOp.prototype), info)); // insert ln before decrease on left for pass in - direction
                      ln_inserted = true;
                    }

                    if (shaping.count > MAX_XFER_CT) { // for multi decrease on right side: if d === '+', add + pass that goes from newN to prevN, does decrease, and then resumes.
                      for (let n=shaping.newN; n<=shaping.prevN; ++n) {
                        iter_output.push(new KnitoutOp({op: 'knit', d: '+', bn: ['b', n], cs: info.cs}));
                      }
                    } else {
                      if (miss_op && miss_op.bn[1] > shaping.prevN) iter_output.push(miss_op);
                      else iter_output.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', shaping.prevN], cs: info.cs})); //TODO: maybe check to ensure that info.bn[1] < shaping.prevN //?
                      miss_op = undefined;
                    }
                  }
                } else {
                  if (shaping.count > MAX_XFER_CT) {
                    miss_op = undefined; //don't miss past
                  } else {
                    if (shaping.side === 'right' && info.d === '+' && k_args.bn[1] >= shaping.prevN-1) {
                      iter_output.push(new KnitoutOp({op: 'miss', d: '-', bn: ['f', shaping.prevN-1], cs: info.cs}));
                    } else if (shaping.side === 'left' && info.d === '-' && k_args.bn[1] <= shaping.prevN+1) {
                      iter_output.push(new KnitoutOp({op: 'miss', d: '+', bn: ['f', shaping.prevN+1], cs: info.cs}));
                    }
                    // } else if (shaping.side === 'left' && info.d === '-' &&)
                  }
                }

                insertShaping(shaping, info.cs, iter_output);
                // // if (specs.inc_method === 'split' && shaping.side === 'left' && shaping.d === '-') // then skip_args //*
                if (shaping.type === 'increase' &&
                  ((shaping.count > MAX_XFER_CT && shaping.newN !== shapeN) ||
                    (specs.inc_method === 'split' &&
                    (shaping.side === 'left' && info.d === '-') ||
                    (shaping.side === 'right' && info.d === '+'))
                )) {
                  skip_args = {...k_args}; // we want to skip all other needles //TODO: check to ensure that this is working
                  skip = true;
                }
              }
            }
          }
        }
      }

      if (!skip && n >= leftN && n <= rightN) {
        if (op_n === undefined) op_n = n;
        k_args.bn = info.bn;

        if (!working_needles[b].includes(n)) working_needles[b].push(n); //TODO: ensure working needles gets rid of bn0s after xfer and also needles after decrease
        if (info.op === 'knit' && twisted_stitches.includes(info.bn.join(''))) { //TODO: adjust this //?
          if (info.d === '+') {
            iter_output.push(
              new KnitoutOp({comment: 'twisted stitch'}),
              new KnitoutOp({op: 'miss', d: '+', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'knit', d: '-', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'miss', d: '+', bn: info.bn, cs: info.cs})
            );
          } else {
            iter_output.push(
              new KnitoutOp({comment: 'twisted stitch'}),
              new KnitoutOp({op: 'miss', d: '-', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'knit', d: '+', bn: info.bn, cs: info.cs}),
              new KnitoutOp({op: 'miss', d: '-', bn: info.bn, cs: info.cs})
            );
          }
          twisted_stitches.splice(twisted_stitches.indexOf(info.bn.join('')), 1);
        } else {
          if (!ln_inserted) {
            iter_output.push(Object.assign(Object.create(KnitoutOp.prototype), info));
            ln_inserted = true;
          }
        }
      }

      if (info.cs.length && iter_output.length) { // replace the carriers
        let new_cs = []
        for (let c of info.cs) {
          let sectC;
          let c_idx = input_carriers.indexOf(c);

          if (c_idx === -1) { // new carrier
            if (!in_carriers.includes(c)) new_cs.push(c);

            leftover_carriers.splice(leftover_carriers.indexOf(c), 1);
            input_carriers.push(c);
            c_idx = input_carriers.length-1;

            for (let i=sect_track[sect_key].carriers.length; i<=c_idx; ++i) {
              sect_track[sect_key].carriers.push(undefined);
            }

            sectC = c;
            sect_track[sect_key].carriers[c_idx] = sectC; // would start undefined since it would be addressed in the for loop above
          } else {
            sectC = sect_track[sect_key].carriers[c_idx];

            if (sectC === undefined) { // an alternative carrier has not been defined yet
              let c_dist = 0;
              for (let i=sect_track[sect_key].carriers.length; i<=c_idx; ++i) { // make any carriers that aren't included in this section undefined 
                sect_track[sect_key].carriers.push(undefined);
              }

              if (sect_track[sect_key].parents.length) { // we could potential get some carriers from a parent section that just finished to reuse
                find_replacement: for (let p_key of sect_track[sect_key].parents) {
                  let replaceC = sect_track[p_key].carriers[c_idx];

                  if (sect_track[sect_key].carriers.includes(replaceC)) continue;

                  if (replaceC !== undefined) {
                    let replaceC_park = carrier_track[replaceC].n;
                    let n_idx = (carrier_track[replaceC].d === '-' ? 0 : 1);
                    let children = sect_track[p_key].children;

                    let [closest_child, child_dist] = Object.entries(children).reduce((min, entry) => {
                      let child_n = entry[1][n_idx];
                      let dist = Math.abs(child_n-replaceC_park);
                      return dist < min[1] ? [entry[0], dist] : min;
                    }, [undefined, Infinity]);

                    // console.log('details:', row_idx, replaceC, n, info.d, carrier_track[replaceC], children, leftN, rightN, sect_key, closest_child, leftover_carriers); //remove //debug

                    if (sect_key == closest_child) {
                      c_dist = child_dist;
                      sectC = replaceC;
                      sect_track[sect_key].carriers[c_idx] = sectC;// would start undefined since it would be addressed in the for loop above
                      sect_track[p_key].carriers[c_idx] = undefined;

                      let leftover_idx = leftover_carriers.indexOf(sectC);
                      if (leftover_idx !== -1) leftover_carriers.splice(leftover_idx, 1);
                      break find_replacement;
                    }
                  }

                  // see if any carriers are done being in use:
                  for (let i=0; i<sect_track[p_key].carriers.length; ++i) {
                    let c = sect_track[p_key].carriers[i];
                    if (c !== undefined) {
                      if (carrierDone(input_carriers[i], row_key, r)) {
                        leftover_carriers.push(c);
                        sect_track[p_key].carriers[i] = undefined;
                      }
                    }
                  }
                }
              }

              if (sectC === undefined) { // if still no good match, find closest one
                /*
                if (!leftover_carriers.length) { // we need to see if there is a different carrier we can use
                  for (let s=0; s<rows_sect_keys[row_idx].indexOf(sect_key); ++s) {
                    let key = rows_sect_keys[row_idx][s];
                    for (let i=0; i<sect_track[key].carriers.length; ++i) {
                      let c = sect_track[key].carriers[i];
                      if (c !== undefined) {
                        if (carrierDone(input_carriers[i], row_key+1, 0)) {
                          leftover_carriers.push(c);
                          sect_track[key].carriers[i] = undefined;
                        }
                      }
                    }
                  }
                }
                */

                let dists = leftover_carriers.map(car => Math.abs(carrier_track[car].n - n));
                c_dist = Math.min(...dists);
                let new_c_idx = dists.indexOf(c_dist);
                sectC = leftover_carriers.splice(new_c_idx, 1)[0];

                sect_track[sect_key].carriers[c_idx] = sectC; // would start undefined since it would be addressed in the for loop above

                if (!in_carriers.includes(sectC)) new_cs.push(sectC);
              }

              if (c_dist >= MIN_FLOAT_DIST) {
                let sectC_n = carrier_track[sectC].n;
                if (new_cs.includes(sectC)) {
                  output.push(`${specs.in_op} ${sectC}`);
                  in_carriers.push(sectC);
                  if (sectC_n < n) {
                    let firstN = rows_edgeNs[row_idx][0][0];
                    // let firstN = row_idx === -1 ? rows_edgeNs[0][0][0] : rows_edgeNs[row_idx][0][0]; //BEEP

                    if (sectC_n < firstN) firstN = sectC_n;
                    to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '+', 'f', sectC, output));
                  } else {
                    let firstN = rows_edgeNs[row_idx][rows_edgeNs[row_idx].length-1][1];
                    // let firstN = row_idx === -1 ? rows_edgeNs[0][rows_edgeNs[row_idx].length-1][1] : rows_edgeNs[row_idx][rows_edgeNs[row_idx].length-1][1]; //BEEP

                    if (sectC_n > firstN) firstN = sectC_n;

                    to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '-', 'f', sectC, output));
                  }

                  if (specs.machine.includes('swg')) output.push(`releasehook ${sectC}`);

                  new_cs.splice(new_cs.indexOf(sectC), 1);
                }
                if (sectC_n < n) {
                  for (let n_=sectC_n; n_<n; ++n_) {
                    if (!working_needles['b'].includes(n_)) {
                      output.push(`tuck + b${n_} ${sectC}`);
                      to_drop.push(['b', n_]);
                    } else output.push(`knit + b${n_} ${sectC}`);
                  }

                  if (info.d === '-') output.push(`miss + b${n} ${sectC}`);
                } else {
                  for (let n_=sectC_n; n_>n; --n_) {
                    if (!working_needles['b'].includes(n_)) {
                      output.push(`tuck - b${n_} ${sectC}`);
                      to_drop.push(['b', n_]);
                    } else output.push(`knit - b${n_} ${sectC}`);
                  }

                  if (info.d === '+') output.push(`miss - b${n} ${sectC}`);
                }

                console.log(`need to place carrier, ${sectC}, since it is ${c_dist} needles away from working needle, ${n}.`); //debug
              }
              if (specs.visColors[c]) output.push(`x-vis-color ${specs.visColors[c]} ${sectC}`);
            }
          }

          if (sectC === undefined) throw new Error('sectC undefined.  leftover_carriers:', leftover_carriers); //debug

          replace_cs.push(sectC);

          carrier_track[sectC].row = row_idx;
          if (info.d) carrier_track[sectC].d = info.d;
          if (op_n !== undefined) carrier_track[sectC].n = op_n;
        }

        if (new_cs.length) {
          output.push(`${specs.in_op} ${new_cs.join(' ')}`);
          
          for (let sectC of new_cs) {
            in_carriers.push(sectC);
            if (info.d === '+') {
              let firstN = rows_edgeNs[row_idx][0][0];
              // let firstN = row_idx === -1 ? rows_edgeNs[0][0][0] : rows_edgeNs[row_idx][0][0]; //BEEP

              to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '+', 'f', sectC, output));
            } else {
              let firstN = rows_edgeNs[row_idx][rows_edgeNs[row_idx].length-1][1];
              // let firstN = row_idx === -1 ? rows_edgeNs[0][rows_edgeNs[row_idx].length-1][1] : rows_edgeNs[row_idx][rows_edgeNs[row_idx].length-1][1]; //BEEP

              to_drop = to_drop.concat(tuckPattern(specs.machine, firstN, '-', 'f', sectC, output));
            }
          }

          if (specs.machine.includes('swg')) output.push(`releasehook ${new_cs.join(' ')}`); //TODO: maybe move releasehook to after there is more knitting //?
        }
      }
    }

    if (miss_op) iter_output.push(miss_op); //TODO: decide if should insert this before shaping
    
    if (iter_output.length) {
      iter_output.forEach(k_op => {
        if (replace_cs.length && arraysEqual(k_op.cs, info.cs)) k_op.replaceArgs({'cs': replace_cs});
        k_op.generateCode(output);
      });
    }

    if (to_drop.length) {
      for (let bn_ of to_drop) {
        output.push(`drop ${bn_.join('')}`);
      }
    }

    if (doneCs.length && row_idx < rows.length-1) {
      for (let c of doneCs) {
        let c_idx = sect_track[sect_key].carriers.indexOf(c);
        sect_track[sect_key].carriers[c_idx] = undefined;
        leftover_carriers.unshift(c);
      }
    }
  }

  return output;
}


function generateKnitout(file_content, shape_code, leftN, rightN, carrier_ops_, last_carrier_ops_, specs_) {
  // make these params global:
  MIN = leftN;
  MAX = rightN;
  carrier_ops = carrier_ops_;
  carrier_ops_keys = Object.keys(carrier_ops).sort((a, b) => a-b);
  last_carrier_ops = last_carrier_ops_;
  specs = specs_;
  // specs.machine = machine;
  // specs.carriers = carriers;
  // specs.inc_method = inc_method;
  // specs.visColors = visColors;

  if (specs.machine === 'kniterate') {
    specs.in_op = 'in';
    specs.out_op = 'out';
  } else {
    specs.in_op = 'inhook';
    specs.out_op = 'outhook';
  }

  leftover_carriers = [...specs.carriers];

  [header_section, waste_section, caston_section, rows, bindoff_section] = rowsArray(file_content);

  let out_park = specs.machine === 'kniterate' ?  MIN-1 : MAX+1; // this means they all start off the needle bed (side determined by where carriers are parked when they're out for the given machine)
  for (let c of specs.carriers) {
    carrier_track[c] = new Carrier({n: out_park});
  }

  let output = header_section;

  let shaping = determineShaping(shape_code);

  if (waste_section.length) {
    output = output.concat(waste_section);

    let in_re = new RegExp(`(${specs.in_op}) ([ \\d+]+)`);
    let out_re = new RegExp(`(${specs.out_op}) ([ \\d+]+)`);
    for (let ln of waste_section) {
      let in_op = ln.match(in_re);
      if (in_op) in_carriers.push(...in_op[2].trim().split(' '));
      else {
        let out_op = ln.match(out_re);
        if (out_op) in_carriers = in_carriers.filter(c => !out_op[2].trim().split(' ').includes(c));
        else {
          let carrier_ln = ln.match(/^(knit|miss|tuck|split) ([+|-])( ?([[f|b]\d+)? ([[f|b]\d+))([ \d+]+)/);
          if (carrier_ln) {
            let d = carrier_ln[2];
            let n = parseInt(carrier_ln[5].match(/\d+/)[0]);
            // bn[1] = parseInt(bn[1]);
            let cs = carrier_ln[6].trim().split(' ');
            for (let c of cs) {
              carrier_track[c].d = d;
              carrier_track[c].n = n;
              // carrier_track[c].row = -1; //?
            }
          }
        }
      }
    }

    output.push('rack 0.25');
    let i = 0;
    let leftN = rows_edgeNs[0][i][0];
    for (let n=MIN; n<=MAX; ++n) {
      if (n < leftN) {
        output.push(`drop f${n}`, `drop b${n}`);
      } else {
        n = rows_edgeNs[0][i][1];
        i += 1;
        if (i < rows_edgeNs[0].length) leftN = rows_edgeNs[0][i][0];
        else leftN = MAX+1;
      }
    }
    output.push('rack 0');
  }
  
  let row_key = specs.init_row_key;
  for (let r=0; r<rows.length; ++r) {
    output.push(`;row: ${r+1}`);

    let eligible_needles = [];
    for (let edgeNs of rows_edgeNs[r]) {
      for (let n=edgeNs[0]; n<=edgeNs[1]; ++n) {
        eligible_needles.push(n);
      }
    }

    for (let b of Object.keys(working_needles)) {
      working_needles[b] = working_needles[b].filter(n => eligible_needles.includes(n));
    }

    let sect_ct = rows_edgeNs[r].length;

    let sect_keys = rows_sect_keys[r];

    for (let i=0; i<sect_keys.length; ++i) {
      let sect_key = sect_keys[i];

      shaping_needles = Object.keys(shaping[r][sect_key]).map(Number);

      if (sect_ct > 1) output.push(`;section: ${i+1}/${sect_ct}`);

      if (r === 0) output = output.concat(cookieCutter(caston_section, rows_edgeNs[r][i], shaping[r][sect_key], 0, sect_key, -1)); // caston row key === -1

      output = output.concat(cookieCutter(rows[r], rows_edgeNs[r][i], shaping[r][sect_key], r, sect_key, row_key));
    }

    if (r > 0) {
      let done_sects = rows_sect_keys[r-1].filter(key => !sect_keys.includes(key));
      if (done_sects.length) {
        for (let sect_key of done_sects) {
          let bindoff_shaping = shaping[r][sect_key];
          if (bindoff_shaping) {
            let bindoff_carrier;
            let max_fop_ct = -Infinity;
            for (let i=0; i<sect_track[sect_key].carriers.length; ++i) {
              let fop_ct = carrier_ops[row_key].filter(el => el.cs.includes(input_carriers[i]) && el.bn[0] === 'f').length;
              if (fop_ct > max_fop_ct) {
                bindoff_carrier = sect_track[sect_key].carriers[i];
                max_fop_ct = fop_ct;
              }
            }

            bindoff_shaping = Object.values(bindoff_shaping).filter(el => el.d === carrier_track[bindoff_carrier].d)[0];
            let bindoff_output = [];

            let off_limits = bindoff_shaping.side === 'left' ? [bindoff_shaping.prevN-1] : [bindoff_shaping.prevN+1];

            bindoff(specs, bindoff_shaping.side, bindoff_shaping.count, bindoff_shaping.prevN, bindoff_carrier, bindoff_output, false, off_limits);

            bindoff_output.push(new KnitoutOp({op: 'drop', bn: ['b', bindoff_shaping.newN]})); //TODO: maybe knit tag instead so less likely to unravel

            bindoff_output.forEach(k_op => {
              k_op.generateCode(output);
            });
          }
  
          leftover_carriers = leftover_carriers.concat(sect_track[sect_key].carriers.filter(c => c !== undefined));
        }
      }
    }
    row_key += 1;
  }

  let bindoff_ln = bindoff_section.find(ln => ln.includes('knit '));

  if (bindoff_ln) {
    let edgeN = specs.machine === 'kniterate' ? rows_edgeNs[rows.length-1][0][0] : rows_edgeNs[rows.length-1][rows_edgeNs[row_idx].length-1][1];

    let bindoff_output = [];
    output.push(';bindoff section');
    
    let info = knitoutInfo(bindoff_ln);
    let bindoff_carrier = info.cs[0];

    let last_sect_keys = rows_sect_keys[rows.length-1];

    for (let i=0; i<last_sect_keys.length; ++i) {
      let sect_key = last_sect_keys[i];
      let c_idx = input_carriers.indexOf(bindoff_carrier);
      let bindC = sect_track[sect_key].carriers[c_idx];

      for (let c of sect_track[sect_key].carriers[c_idx]) {
        if (c === undefined) continue;
        else {
          if (bindC === undefined) bindC = c;

          if (c !== bindC && ((specs.machine === 'kniterate' && carrier_track[c].n <= edgeN) || (specs.machine.includes('swg') && carrier_track[c].n >= edgeN))) {
            output.push(`${specs.out_op} ${c}`);
            delete carrier_track[c];
          }
        }
      }

      let bindoff_edgeNs = rows_edgeNs[rows.length-1][i]; //TODO: do this for each section, if applicable
      let bindoff_count = bindoff_edgeNs[1]- bindoff_edgeNs[0]+1;
      let bindoff_side, bindoffN, last_needle;

      if (carrier_track[bindC].d === '-') {
        bindoff_side = 'left';
        bindoffN = bindoff_edgeNs[0];
        last_needle = bindoff_edgeNs[1];
      } else {
        bindoff_side = 'right';
        bindoffN = bindoff_edgeNs[1];
        last_needle = bindoff_edgeNs[0];
      }

      bindoff(specs, bindoff_side, bindoff_count, bindoffN, bindC, bindoff_output, false, []);

      if (i === last_sect_keys.length-1) {
        bindoff_output.push(new KnitoutOp({op: specs.out_op, cs: [bindC]}));
        in_carriers.splice(in_carriers.indexOf(bindC), 1); //?
        // delete carrier_track[bindC]; //BEEP
      }

      bindoff_output.push(new KnitoutOp({op: 'drop', bn: ['b', last_needle]})); //TODO: maybe knit tag instead so less likely to unravel
    }

    bindoff_output.forEach(k_op => {
      k_op.generateCode(output);
    });
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

  for (let c of specs.carriers) {
    if (in_carriers.includes(c)) output.push(`${specs.out_op} ${c}`); //TODO: take out any that are to to the side of the bindoff carrier first
    // if (Object.keys(carrier_track).includes(c)) output.push(`${specs.out_op} ${c}`); //TODO: take out any that are to to the side of the bindoff carrier first
  }
  
	let final_file = JSON.stringify(output).replace(/"/gi, '').replace(/\[|\]/gi, '').split(',');
	final_file = final_file.join('\n');
  return final_file;
}


module.exports = { generateKnitout };

